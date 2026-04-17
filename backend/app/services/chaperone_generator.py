"""
Generate SteamVR chaperone configuration from processed room data.
"""
import json
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path

class ChaperoneGenerator:
    """
    Generates valid SteamVR chaperone_info.vrchap files.
    
    SteamVR Chaperone Format (version 5):
    {
        "version": 5,
        "universes": [
            {
                "collision_bounds": [  // Array of wall segments
                    [[x1,y1,z1], [x2,y2,z2], [x3,y3,z3], [x4,y4,z4]],  // Wall quad
                    ...
                ],
                "play_area": [width, depth],  // Rectangle inscribed in bounds
                "seated": {"translation": [x,y,z], "yaw": radians},
                "standing": {"translation": [x,y,z], "yaw": radians},
                "time": "ISO timestamp",
                "universeID": "unique_id"
            }
        ]
    }
    """
    
    def __init__(self, ceiling_height: float = 2.43):
        self.ceiling_height = ceiling_height
    
    def generate(
        self, 
        walls: List[List[List[float]]],
        play_area: List[float],
        room_center: List[float] = None,
        universe_id: str = None
    ) -> Dict[str, Any]:
        """
        Generate a complete chaperone configuration.
        
        Args:
            walls: List of wall quads, each quad is [floor_start, ceiling_start, ceiling_end, floor_end]
            play_area: [width, depth] of playable area
            room_center: [x, y, z] center of room (defaults to origin)
            universe_id: Unique identifier for this room configuration
            
        Returns:
            Dictionary matching SteamVR chaperone format
        """
        if room_center is None:
            room_center = [0, 0, 0]
        
        if universe_id is None:
            universe_id = str(int(datetime.now().timestamp()))
        
        # Ensure we have at least 3 walls for a valid room
        if len(walls) < 3:
            # Create a default 2x2m room
            walls = self._create_default_room(2.0, 2.0)
        
        # Create seated and standing positions (at room center, floor level)
        seated_pos = [room_center[0], -0.3, room_center[2]]  # Slightly below floor
        standing_pos = [room_center[0], 0, room_center[2]]    # Floor level
        
        # Format time like SteamVR: "Thu Apr 16 08:42:56 2026"
        time_str = datetime.now().strftime("%a %b %d %H:%M:%S %Y")
        
        config = {
            "jsonid": "chaperone_info",
            "version": 5,
            "universes": [
                {
                    "collision_bounds": walls,
                    "play_area": play_area,
                    "seated": {
                        "translation": seated_pos,
                        "yaw": 0.0
                    },
                    "standing": {
                        "translation": standing_pos,
                        "yaw": 0.0
                    },
                    "time": time_str,
                    "universeID": universe_id
                }
            ]
        }
        
        return config
    
    def _create_default_room(self, width: float, depth: float) -> List[List[List[float]]]:
        """Create a simple rectangular room with the given dimensions"""
        half_width = width / 2
        half_depth = depth / 2
        h = self.ceiling_height
        
        # Rectangle corners (clockwise from top-left)
        corners = [
            [-half_width, 0, -half_depth],      # Front-left
            [half_width, 0, -half_depth],       # Front-right
            [half_width, 0, half_depth],          # Back-right
            [-half_width, 0, half_depth],         # Back-left
        ]
        
        walls = []
        n = len(corners)
        
        for i in range(n):
            j = (i + 1) % n
            
            # Wall quad: floor-start, ceiling-start, ceiling-end, floor-end
            wall = [
                corners[i],                                      # Floor start
                [corners[i][0], h, corners[i][2]],              # Ceiling start
                [corners[j][0], h, corners[j][2]],              # Ceiling end
                corners[j]                                         # Floor end
            ]
            walls.append(wall)
        
        return walls
    
    def save(self, config: Dict[str, Any], output_path: str):
        """Save chaperone configuration to file"""
        with open(output_path, 'w') as f:
            json.dump(config, f, indent=2)
    
    def validate(self, config: Dict[str, Any]) -> tuple[bool, List[str]]:
        """
        Validate a chaperone configuration.
        
        Returns:
            (is_valid, list_of_errors)
        """
        errors = []
        
        # Check version
        if config.get('version') != 5:
            errors.append(f"Invalid version: {config.get('version')}, expected 5")
        
        # Check universes
        universes = config.get('universes', [])
        if len(universes) == 0:
            errors.append("No universes defined")
        
        for i, universe in enumerate(universes):
            prefix = f"Universe {i}: "
            
            # Check collision_bounds
            bounds = universe.get('collision_bounds', [])
            if len(bounds) < 3:
                errors.append(f"{prefix}At least 3 walls required, found {len(bounds)}")
            
            for j, wall in enumerate(bounds):
                if len(wall) != 4:
                    errors.append(f"{prefix}Wall {j} must have 4 points, found {len(wall)}")
                for k, point in enumerate(wall):
                    if len(point) != 3:
                        errors.append(f"{prefix}Wall {j} point {k} must have 3 coordinates")
            
            # Check play_area
            play_area = universe.get('play_area', [])
            if len(play_area) != 2:
                errors.append(f"{prefix}play_area must be [width, depth]")
            
            # Check seated/standing
            for pose_type in ['seated', 'standing']:
                pose = universe.get(pose_type, {})
                translation = pose.get('translation', [])
                if len(translation) != 3:
                    errors.append(f"{prefix}{pose_type}.translation must have 3 coordinates")
                if 'yaw' not in pose:
                    errors.append(f"{prefix}{pose_type}.yaw is required")
            
            # Check time and universeID
            if 'time' not in universe:
                errors.append(f"{prefix}time is required")
            if 'universeID' not in universe:
                errors.append(f"{prefix}universeID is required")
        
        return len(errors) == 0, errors
    
    def backup_existing(self, chaperone_path: Path) -> Path:
        """Create a backup of existing chaperone file"""
        if not chaperone_path.exists():
            return None
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = chaperone_path.parent / f"chaperone_info_backup_{timestamp}.vrchap"
        
        with open(chaperone_path, 'r') as src:
            with open(backup_path, 'w') as dst:
                dst.write(src.read())
        
        return backup_path
