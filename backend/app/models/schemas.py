from pydantic import BaseModel
from typing import List, Tuple, Optional
from datetime import datetime

class Point2D(BaseModel):
    x: float
    y: float

class Point3D(BaseModel):
    x: float
    y: float
    z: float

class PerimeterAnnotation(BaseModel):
    photo_id: str
    points: List[Point2D]

class PhotoInfo(BaseModel):
    id: str
    filename: str
    url: str
    path: str
    exif: Optional[dict] = None

class PhotoUploadResponse(BaseModel):
    photos: List[PhotoInfo]
    message: str

class SeatedStandingConfig(BaseModel):
    translation: List[float]
    yaw: float

class ChaperoneUniverse(BaseModel):
    collision_bounds: List[List[List[float]]]  # Array of wall quads
    play_area: List[float]  # [width, depth]
    seated: SeatedStandingConfig
    standing: SeatedStandingConfig
    time: str
    universeID: str

class ChaperoneConfig(BaseModel):
    version: int
    universes: List[ChaperoneUniverse]

class SteamVRStatus(BaseModel):
    detected: bool
    config_path: Optional[str]
    chaperone_exists: bool
    writable: bool

class ProcessingResult(BaseModel):
    photo_id: str
    depth_map_url: Optional[str]
    points_3d: List[Point3D]
    confidence: float

class RoomDimensions(BaseModel):
    width: float
    depth: float
    height: float
    volume: float
