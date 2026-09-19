from pydantic import BaseModel

class PredictRequest(BaseModel):
    lat: float
    lon: float
    uncertainty: bool = False

class CalamityRequest(BaseModel):
    active: bool