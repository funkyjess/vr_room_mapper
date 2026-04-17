from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import json
from pathlib import Path
from typing import List
import shutil
from datetime import datetime

from app.models.schemas import (
    PhotoUploadResponse, 
    PerimeterAnnotation, 
    ChaperoneConfig,
    SteamVRStatus
)
from app.services.depth_estimation import DepthEstimator
from app.services.multi_view import MultiViewProcessor
from app.services.chaperone_generator import ChaperoneGenerator

app = FastAPI(
    title="SteamVR Room Perimeter Mapper API",
    description="API for processing room photos and generating SteamVR chaperone bounds",
    version="0.1.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
depth_estimator = DepthEstimator()
multi_view_processor = MultiViewProcessor()
chaperone_generator = ChaperoneGenerator()

# Storage for uploaded photos and annotations
UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

STEAMVR_CONFIG_PATH = Path("C:/Program Files (x86)/Steam/config")

@app.get("/")
async def root():
    return {"message": "SteamVR Room Perimeter Mapper API"}

@app.post("/api/upload", response_model=PhotoUploadResponse)
async def upload_photos(files: List[UploadFile] = File(...)):
    """Upload multiple photos for processing"""
    if len(files) > 6:
        raise HTTPException(status_code=400, detail="Maximum 6 photos allowed")
    
    uploaded_photos = []
    
    for file in files:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail=f"File {file.filename} is not an image")
        
        # Save file
        photo_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
        file_path = UPLOAD_DIR / photo_id
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # TODO: Extract EXIF data
        
        uploaded_photos.append({
            "id": photo_id,
            "filename": file.filename,
            "url": f"/uploads/{photo_id}",
            "path": str(file_path)
        })
    
    return PhotoUploadResponse(
        photos=uploaded_photos,
        message=f"Successfully uploaded {len(uploaded_photos)} photos"
    )

@app.post("/api/annotate/{photo_id}")
async def annotate_perimeter(photo_id: str, annotation: PerimeterAnnotation):
    """Save perimeter annotation for a specific photo"""
    # TODO: Store annotation in database or file
    return {"status": "success", "photo_id": photo_id, "points": len(annotation.points)}

@app.post("/api/process")
async def process_photos(photo_ids: List[str]):
    """Process all annotated photos and generate 3D room model"""
    # TODO: 
    # 1. Load photos and annotations
    # 2. Run depth estimation on each
    # 3. Perform multi-view triangulation
    # 4. Generate smoothed 3D perimeter
    
    return {
        "status": "processing",
        "photo_count": len(photo_ids),
        "estimated_time": len(photo_ids) * 5  # seconds per photo
    }

@app.get("/api/steamvr/status", response_model=SteamVRStatus)
async def get_steamvr_status():
    """Check if SteamVR config directory is accessible"""
    detected = STEAMVR_CONFIG_PATH.exists()
    chaperone_exists = (STEAMVR_CONFIG_PATH / "chaperone_info.vrchap").exists() if detected else False
    
    return SteamVRStatus(
        detected=detected,
        config_path=str(STEAMVR_CONFIG_PATH) if detected else None,
        chaperone_exists=chaperone_exists,
        writable=detected and os.access(STEAMVR_CONFIG_PATH, os.W_OK)
    )

@app.post("/api/steamvr/apply")
async def apply_to_steamvr(config: ChaperoneConfig):
    """Apply generated chaperone config to SteamVR"""
    # Debug: log what we received
    print(f"DEBUG: Received config.jsonid = {config.jsonid}")
    print(f"DEBUG: Config model_dump = {config.model_dump(exclude_none=False)}")
    
    if not STEAMVR_CONFIG_PATH.exists():
        raise HTTPException(status_code=404, detail="SteamVR config directory not found")
    
    # Check write permissions
    if not os.access(STEAMVR_CONFIG_PATH, os.W_OK):
        raise HTTPException(
            status_code=403, 
            detail=f"Permission denied: Run backend as administrator to write to {STEAMVR_CONFIG_PATH}"
        )
    
    chaperone_path = STEAMVR_CONFIG_PATH / "chaperone_info.vrchap"
    
    try:
        # Backup existing config
        if chaperone_path.exists():
            backup_path = STEAMVR_CONFIG_PATH / f"chaperone_info_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.vrchap"
            shutil.copy(chaperone_path, backup_path)
        
        # Write new config (Pydantic v2: model_dump() with exclude_none=False to include jsonid)
        with open(chaperone_path, "w") as f:
            json.dump(config.model_dump(exclude_none=False), f, indent=2)
        
        return {
            "status": "success",
            "message": "Chaperone configuration applied. Please restart SteamVR.",
            "path": str(chaperone_path)
        }
    except PermissionError as e:
        raise HTTPException(
            status_code=403,
            detail=f"Permission denied writing to {chaperone_path}. Run as administrator. Error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write config: {str(e)}")

@app.get("/api/chaperone/generate")
async def generate_chaperone(photo_ids: List[str]):
    """Generate chaperone configuration from processed photos"""
    # TODO: Generate actual chaperone from processed data
    
    # Mock chaperone config - matches actual room from chaperone_info_orig.BAKvrchap
    time_str = datetime.now().strftime("%a %b %d %H:%M:%S %Y")
    config = ChaperoneConfig(
        jsonid="chaperone_info",
        version=5,
        universes=[
            {
                "collision_bounds": [
                    [[-2.00542593, 0, 1.15905643], [-2.00542593, 2.43000007, 1.15905643], [-0.968084455, 2.43000007, 1.1387527], [-0.968084455, 0, 1.1387527]],
                    [[-0.968084455, 0, 1.1387527], [-0.968084455, 2.43000007, 1.1387527], [0.405491382, 2.43000007, 1.82308495], [0.405491382, 0, 1.82308495]],
                    [[0.405491382, 0, 1.82308495], [0.405491382, 2.43000007, 1.82308495], [1.99530935, 2.43000007, 1.48085308], [1.99530935, 0, 1.48085308]],
                    [[1.99530935, 0, 1.48085308], [1.99530935, 2.43000007, 1.48085308], [2.493994, 2.43000007, -1.12542784], [2.493994, 0, -1.12542784]],
                    [[2.493994, 0, -1.12542784], [2.493994, 2.43000007, -1.12542784], [-2.1122694, 2.43000007, -1.09121358], [-2.1122694, 0, -1.09121358]],
                    [[-2.1122694, 0, -1.09121358], [-2.1122694, 2.43000007, -1.09121358], [-2.00542593, 2.43000007, 1.15905643], [-2.00542593, 0, 1.15905643]]
                ],
                "play_area": [3.20000052, 1.70000029],
                "seated": {
                    "translation": [0.442341655, -0.295272112, 3.78655791],
                    "yaw": -3.01873016
                },
                "standing": {
                    "translation": [0.298864633, 0.946626484, 3.36617875],
                    "yaw": -1.3893714
                },
                "time": time_str,
                "universeID": "1775924886"
            }
        ]
    )
    
    return config

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
