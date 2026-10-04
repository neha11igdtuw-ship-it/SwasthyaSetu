"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

const SITE_URL = "https://swasthya-setu-iota.vercel.app/";

interface SiteQRCodeProps {
  size?: number;
  className?: string;
}

export function SiteQRCode({ size = 88, className = "" }: SiteQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(SITE_URL, {
      width: size * 2,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [size]);

  if (!dataUrl) {
    return (
      <div
        className={`rounded-lg bg-slate-800 animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <a
      href={SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Scan or click to open SwasthyaSetu"
      className={`inline-flex rounded-lg bg-white p-1.5 shadow-sm ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="QR code linking to the SwasthyaSetu website"
        width={size}
        height={size}
      />
    </a>
  );
}
