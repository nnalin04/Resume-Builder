from pydantic import BaseModel


class DirectExportRequest(BaseModel):
    sections: dict
    template: str = "classic"
