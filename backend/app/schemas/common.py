import uuid

from pydantic import BaseModel, ConfigDict


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class IDModel(ORMBase):
    id: uuid.UUID
