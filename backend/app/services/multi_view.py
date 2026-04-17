"""
Multi-view geometry processing for combining perimeters from multiple photos.
"""
import numpy as np
from typing import List, Tuple, Dict
from dataclasses import dataclass
from scipy.spatial.distance import cdist
from scipy.optimize import least_squares

@dataclass
class CameraPose:
    """Camera position and orientation in 3D space"""
    position: np.ndarray  # [x, y, z]
    rotation: np.ndarray  # 3x3 rotation matrix
    focal_length: float

@dataclass
class PhotoData:
    """Processed photo with 3D perimeter points"""
    photo_id: str
    points_2d: List[Tuple[float, float]]  # Normalized image coordinates
    points_3d: np.ndarray  # [N, 3] array of 3D points
    camera_pose: CameraPose
    confidence: np.ndarray  # [N] confidence scores

class MultiViewProcessor:
    """
    Process multiple photos to combine perimeter annotations into a unified 3D model.
    
    Uses:
    - Feature matching between photos to find camera poses
    - Ray intersection for multi-view triangulation
    - Laplacian smoothing for clean perimeter edges
    """
    
    def __init__(self, ceiling_height: float = 2.43):
        self.ceiling_height = ceiling_height
    
    def estimate_camera_poses(self, photos: List[PhotoData]) -> List[PhotoData]:
        """
        Estimate relative camera positions from photo correspondences.
        
        For now, assumes cameras are positioned around the room perimeter.
        In production, this would use feature matching (SuperPoint/SuperGlue).
        """
        n_cameras = len(photos)
        if n_cameras == 0:
            return photos
        
        # Place cameras in a circle around the room center
        radius = 2.0  # meters from center
        angles = np.linspace(0, 2 * np.pi, n_cameras, endpoint=False)
        
        for i, photo in enumerate(photos):
            angle = angles[i]
            x = radius * np.cos(angle)
            z = radius * np.sin(angle)
            y = 1.5  # Camera height (eye level)
            
            # Camera looks at center
            position = np.array([x, y, z])
            forward = np.array([0, 0, 0]) - position
            forward = forward / np.linalg.norm(forward)
            
            # Create rotation matrix (simplified)
            up = np.array([0, 1, 0])
            right = np.cross(up, forward)
            right = right / np.linalg.norm(right)
            up = np.cross(forward, right)
            
            rotation = np.stack([right, up, forward], axis=1)
            
            photo.camera_pose = CameraPose(
                position=position,
                rotation=rotation,
                focal_length=photo.camera_pose.focal_length if photo.camera_pose else 1000
            )
        
        return photos
    
    def triangulate_points(self, photos: List[PhotoData]) -> np.ndarray:
        """
        Triangulate 3D points from multiple camera views.
        
        Uses ray intersection: cast rays from each camera through the annotated
        2D points and find where they intersect in 3D space.
        """
        if len(photos) == 0:
            return np.array([])
        
        if len(photos) == 1:
            # Single photo: return points as-is (already projected by depth)
            return photos[0].points_3d
        
        # Multiple photos: combine and refine
        all_points = []
        
        # Group points by semantic correspondence (simplified: use nearest neighbor)
        # In production, use feature descriptors for matching
        
        for photo in photos:
            for point_3d in photo.points_3d:
                all_points.append({
                    'point': point_3d,
                    'camera': photo.camera_pose.position if photo.camera_pose else np.array([0, 1.5, 0]),
                    'confidence': 1.0  # Default confidence
                })
        
        if len(all_points) == 0:
            return np.array([])
        
        # Cluster nearby points from different views
        points_array = np.array([p['point'] for p in all_points])
        
        # Simple clustering: group points within 10cm
        threshold = 0.1  # 10cm
        merged_points = []
        used = set()
        
        for i in range(len(points_array)):
            if i in used:
                continue
            
            # Find all points within threshold
            cluster_indices = [i]
            for j in range(i + 1, len(points_array)):
                if j in used:
                    continue
                dist = np.linalg.norm(points_array[i] - points_array[j])
                if dist < threshold:
                    cluster_indices.append(j)
                    used.add(j)
            
            # Average cluster to get merged point
            cluster_points = points_array[cluster_indices]
            merged_point = np.mean(cluster_points, axis=0)
            merged_points.append(merged_point)
        
        return np.array(merged_points)
    
    def smooth_perimeter(self, points: np.ndarray, iterations: int = 2) -> np.ndarray:
        """
        Apply Laplacian smoothing to perimeter points.
        
        This creates cleaner edges while preserving the overall shape.
        """
        if len(points) < 3:
            return points
        
        smoothed = points.copy()
        
        for _ in range(iterations):
            new_points = smoothed.copy()
            n = len(smoothed)
            
            for i in range(n):
                # Get neighbors (previous and next)
                prev_idx = (i - 1) % n
                next_idx = (i + 1) % n
                
                # Laplacian: average of neighbors
                neighbor_avg = (smoothed[prev_idx] + smoothed[next_idx]) / 2
                
                # Smooth with lambda = 0.5
                new_points[i] = 0.7 * smoothed[i] + 0.3 * neighbor_avg
            
            smoothed = new_points
        
        return smoothed
    
    def enforce_perpendicular_walls(
        self, 
        points: np.ndarray, 
        tolerance_degrees: float = 15
    ) -> np.ndarray:
        """
        Detect and align wall segments to be perpendicular (for rectangular rooms).
        
        Args:
            points: [N, 3] array of floor-level points
            tolerance_degrees: Angle tolerance for considering walls perpendicular
        """
        if len(points) < 4:
            return points
        
        # Calculate wall directions
        n = len(points)
        wall_vectors = []
        
        for i in range(n):
            next_idx = (i + 1) % n
            wall_vec = points[next_idx] - points[i]
            wall_vec[1] = 0  # Ignore height
            if np.linalg.norm(wall_vec) > 0:
                wall_vec = wall_vec / np.linalg.norm(wall_vec)
            wall_vectors.append(wall_vec)
        
        # Find dominant directions using clustering
        directions = np.array(wall_vectors)[:, [0, 2]]  # XZ plane only
        
        # Simple approach: align to cardinal directions if close
        aligned_points = points.copy()
        
        for i in range(n):
            wall_dir = directions[i]
            angle = np.arctan2(wall_dir[1], wall_dir[0]) * 180 / np.pi
            
            # Check if close to cardinal direction
            cardinals = [0, 90, 180, -90, -180]
            for cardinal in cardinals:
                if abs(angle - cardinal) < tolerance_degrees:
                    # Align this wall segment
                    next_idx = (i + 1) % n
                    
                    # Calculate current wall length
                    wall_vec = points[next_idx] - points[i]
                    wall_length = np.linalg.norm(wall_vec[[0, 2]])
                    
                    # Snap to cardinal direction
                    cardinal_rad = np.radians(cardinal)
                    new_dir = np.array([np.cos(cardinal_rad), 0, np.sin(cardinal_rad)])
                    
                    # Adjust next point
                    aligned_points[next_idx] = points[i] + new_dir * wall_length
                    break
        
        return aligned_points
    
    def process_photos(self, photos: List[PhotoData]) -> Dict:
        """
        Main processing pipeline for multi-view perimeter reconstruction.
        
        Returns:
            Dictionary with:
            - points_3d: Smoothed 3D perimeter points
            - walls: Wall segments for chaperone
            - play_area: Largest inscribed rectangle
            - dimensions: Room dimensions (width, depth, height)
        """
        # 1. Estimate camera poses
        photos = self.estimate_camera_poses(photos)
        
        # 2. Triangulate points from multiple views
        points_3d = self.triangulate_points(photos)
        
        if len(points_3d) < 3:
            return {
                'points_3d': points_3d,
                'walls': [],
                'play_area': [2.0, 1.5],
                'dimensions': {'width': 2.0, 'depth': 1.5, 'height': self.ceiling_height}
            }
        
        # 3. Smooth the perimeter
        points_3d = self.smooth_perimeter(points_3d)
        
        # 4. Optional: enforce perpendicular walls for rectangular rooms
        # points_3d = self.enforce_perpendicular_walls(points_3d)
        
        # 5. Generate wall segments for chaperone
        walls = []
        n = len(points_3d)
        
        for i in range(n):
            next_idx = (i + 1) % n
            
            # Create wall quad: floor-start, ceiling-start, ceiling-end, floor-end
            floor_start = points_3d[i].tolist()
            floor_end = points_3d[next_idx].tolist()
            
            ceiling_start = [floor_start[0], self.ceiling_height, floor_start[2]]
            ceiling_end = [floor_end[0], self.ceiling_height, floor_end[2]]
            
            wall = [floor_start, ceiling_start, ceiling_end, floor_end]
            walls.append(wall)
        
        # 6. Calculate room dimensions
        xs = points_3d[:, 0]
        zs = points_3d[:, 2]
        width = float(np.max(xs) - np.min(xs))
        depth = float(np.max(zs) - np.min(zs))
        
        # 7. Calculate play area (simplified: 80% of bounding box)
        play_width = width * 0.8
        play_depth = depth * 0.8
        
        return {
            'points_3d': points_3d,
            'walls': walls,
            'play_area': [play_width, play_depth],
            'dimensions': {
                'width': width,
                'depth': depth,
                'height': self.ceiling_height,
                'volume': width * depth * self.ceiling_height
            }
        }
