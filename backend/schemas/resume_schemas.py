from pydantic import BaseModel


class UpdateSectionsRequest(BaseModel):
    sections: dict


class SaveVersionRequest(BaseModel):
    name: str
