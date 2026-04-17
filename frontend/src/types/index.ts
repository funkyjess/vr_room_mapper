export interface Photo {
  id: string;
  file: File;
  url: string;
  exif?: ExifData;
  perimeterPoints: Point2D[];
  status: 'uploading' | 'processing' | 'annotating' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export interface ExifData {
  cameraModel?: string;
  focalLength?: number;
  focalLength35mm?: number;
  orientation?: number;
  dateTime?: string;
  width?: number;
  height?: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface PerimeterSegment {
  floorStart: Point3D;
  ceilingStart: Point3D;
  ceilingEnd: Point3D;
  floorEnd: Point3D;
}

export interface ChaperoneUniverse {
  collision_bounds: number[][][];
  play_area: [number, number];
  seated: {
    translation: [number, number, number];
    yaw: number;
  };
  standing: {
    translation: [number, number, number];
    yaw: number;
  };
  time: string;
  universeID: string;
}

export interface ChaperoneConfig {
  universes: ChaperoneUniverse[];
  version: number;
}

export interface RoomDimensions {
  width: number;
  depth: number;
  height: number;
}
