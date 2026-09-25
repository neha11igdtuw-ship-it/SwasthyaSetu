import asyncio
import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger("teleconsultation_signaling")


class ConsultationSignalingManager:
    """In-memory signaling manager for peer-to-peer WebRTC audio/video consultations.
    
    Maintains active WebSocket connections grouped by appointment/room ID.
    Relays SDP offers, answers, ICE candidates, and fallback text chat messages
    strictly between authenticated participants of the same consultation room.
    """

    def __init__(self):
        # room_id -> list of (user_id, role, WebSocket)
        self._rooms: dict[str, list[dict[str, Any]]] = {}
        self._lock = asyncio.Lock()
        # Message buffer for REST-based signaling fallback: room_id -> list of signals
        self._signal_buffer: dict[str, list[dict[str, Any]]] = {}

    async def connect(self, room_id: str, user_id: str, role: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            if room_id not in self._rooms:
                self._rooms[room_id] = []
            
            # Remove any existing connection for this user in the room
            self._rooms[room_id] = [p for p in self._rooms[room_id] if p["user_id"] != user_id]
            self._rooms[room_id].append({
                "user_id": user_id,
                "role": role,
                "ws": websocket,
            })
            participants_count = len(self._rooms[room_id])

        # Notify other participants in the room
        await self.broadcast_to_others(
            room_id=room_id,
            sender_user_id=user_id,
            message={
                "type": "peer-joined",
                "userId": user_id,
                "role": role,
                "participantsCount": participants_count,
            },
        )

        # Notify the joined participant of current room state
        try:
            await websocket.send_text(
                json.dumps({
                    "type": "room-state",
                    "participantsCount": participants_count,
                    "peers": [
                        {"userId": p["user_id"], "role": p["role"]}
                        for p in self._rooms[room_id]
                        if p["user_id"] != user_id
                    ],
                })
            )
        except Exception as e:
            logger.warning("Error sending initial room state: %s", e)

    async def disconnect(self, room_id: str, user_id: str) -> None:
        role = None
        async with self._lock:
            if room_id in self._rooms:
                for p in self._rooms[room_id]:
                    if p["user_id"] == user_id:
                        role = p["role"]
                        break
                self._rooms[room_id] = [p for p in self._rooms[room_id] if p["user_id"] != user_id]
                if not self._rooms[room_id]:
                    del self._rooms[room_id]

        if role:
            await self.broadcast_to_others(
                room_id=room_id,
                sender_user_id=user_id,
                message={
                    "type": "peer-left",
                    "userId": user_id,
                    "role": role,
                },
            )

    async def broadcast_to_others(self, room_id: str, sender_user_id: str, message: dict[str, Any]) -> None:
        async with self._lock:
            peers = list(self._rooms.get(room_id, []))

        text_data = json.dumps(message)
        for peer in peers:
            if peer["user_id"] != sender_user_id:
                try:
                    await peer["ws"].send_text(text_data)
                except Exception as e:
                    logger.warning("Failed to send signaling message to user %s: %s", peer["user_id"], e)

    async def post_rest_signal(self, room_id: str, sender_user_id: str, message: dict[str, Any]) -> None:
        """Store REST signal and broadcast to any active WebSocket connections."""
        signal_entry = {
            "id": f"sig-{asyncio.get_event_loop().time()}",
            "sender_id": sender_user_id,
            "message": message,
            "timestamp": asyncio.get_event_loop().time(),
        }
        async with self._lock:
            self._signal_buffer.setdefault(room_id, []).append(signal_entry)
            # Keep buffer bounded
            if len(self._signal_buffer[room_id]) > 100:
                self._signal_buffer[room_id] = self._signal_buffer[room_id][-100:]

        await self.broadcast_to_others(room_id, sender_user_id, message)

    async def get_rest_signals(self, room_id: str, user_id: str, since_timestamp: float = 0.0) -> list[dict[str, Any]]:
        async with self._lock:
            signals = self._signal_buffer.get(room_id, [])
            return [
                s for s in signals
                if s["sender_id"] != user_id and s["timestamp"] > since_timestamp
            ]


signaling_manager = ConsultationSignalingManager()
