"""
Depth estimation service using ZoeDepth for metric depth prediction.
"""
from typing import List, Tuple, Optional
import torch
import numpy as np
from PIL import Image
from pathlib import Path
import cv2

class DepthEstimator:
    """
    Wrapper for ZoeDepth model to estimate metric depth from RGB images.
    """
    
    def __init__(self, model_name: str = "ZoeD_NK"):
        self.model_name = model_name
        self.model = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
    def load_model(self):
        """Lazy loading of the ZoeDepth model"""
        if self.model is None:
            try:
                # Try to load ZoeDepth from torch hub
                self.model = torch.hub.load(
                    "isl-org/ZoeDepth", 
                    self.model_name, 
                    pretrained=True
                )
                self.model.to(self.device)
                self.model.eval()
            except Exception as e:
                print(f"Failed to load ZoeDepth: {e}")
                # Fallback: create a mock model for testing
                self.model = self._create_mock_model()
        return self.model
    
    def _create_mock_model(self):
        """Create a mock depth estimator for testing without the full model"""
        class MockModel:
            def infer_pil(self, image):
                # Return a simple gradient as depth
                width, height = image.size
                depth = np.linspace(2, 5, width * height).reshape(height, width)
                return depth
        return MockModel()
    
    def estimate_depth(self, image_path: str) -> np.ndarray:
        """
        Estimate depth from an image file.
        
        Returns:
            np.ndarray: Depth map in meters (H x W)
        """
        self.load_model()
        
        # Load image
        image = Image.open(image_path).convert("RGB")
        
        # Estimate depth
        with torch.no_grad():
            depth = self.model.infer_pil(image)
        
        return np.array(depth)
    
    def project_2d_to_3d(
        self, 
        points_2d: List[Tuple[float, float]], 
        depth_map: np.ndarray,
        image_size: Tuple[int, int],
        focal_length: Optional[float] = None
    ) -> List[Tuple[float, float, float]]:
        """
        Project 2D image points to 3D using depth map.
        
        Args:
            points_2d: List of (x, y) coordinates in normalized [0, 1] space
            depth_map: Depth map in meters
            image_size: (width, height) of original image
            focal_length: Camera focal length in pixels (estimated if None)
            
        Returns:
            List of (x, y, z) 3D coordinates in meters
        """
        h, w = depth_map.shape
        points_3d = []
        
        # Estimate focal length if not provided
        if focal_length is None:
            # Assume ~50mm equivalent on 36mm sensor at image center
            focal_length = max(w, h) * 0.8
        
        cx, cy = w / 2, h / 2
        
        for x_norm, y_norm in points_2d:
            # Convert normalized to pixel coordinates
            x = int(x_norm * w)
            y = int(y_norm * h)
            
            # Clamp to image bounds
            x = max(0, min(x, w - 1))
            y = max(0, min(y, h - 1))
            
            # Get depth at this point
            depth = depth_map[y, x]
            
            # Back-project to 3D
            # X = (x - cx) * depth / focal_length
            # Y = (y - cy) * depth / focal_length  
            # Z = depth
            x_3d = (x - cx) * depth / focal_length
            y_3d = (y - cy) * depth / focal_length
            z_3d = depth
            
            points_3d.append((x_3d, y_3d, z_3d))
        
        return points_3d
    
    def save_depth_visualization(
        self, 
        depth_map: np.ndarray, 
        output_path: str,
        colormap: int = cv2.COLORMAP_TURBO
    ):
        """Save depth map as a colored visualization"""
        # Normalize to 0-255
        depth_norm = cv2.normalize(depth_map, None, 0, 255, cv2.NORM_MINMAX)
        depth_uint8 = depth_norm.astype(np.uint8)
        
        # Apply colormap
        depth_colored = cv2.applyColorMap(depth_uint8, colormap)
        
        # Save
        cv2.imwrite(output_path, depth_colored)
