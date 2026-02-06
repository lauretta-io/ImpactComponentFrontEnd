# API Documentation

This project uses two separate servers:

1. **Local Server (localhost:3001)** - Handles data storage and management (analysis data, timestamps, models)
2. **External Processing Server (localhost:3005)** - Handles image processing and analysis

## Architecture Overview

When the "Capture Image" button is pressed:
1. Both cameras save their images locally
2. Images are POSTed to the external server at `http://localhost:3005/images`
3. The system waits up to 10 seconds for the external server response
4. If after 10 seconds any fields are missing from the response, stock values are used for those specific fields only
5. The local server (localhost:3001) does NOT process images - it only stores data

## Starting the Local Server

```bash
npm run server
```

The local server runs on port 3001 by default and provides endpoints for data storage.

## API Endpoints

### 1. Update Analysis Data

**Endpoint:** `POST http://localhost:3001/api/update-analysis`

**Description:** Create or update analysis data.

**Request Body:**
```json
{
  "environment": "Indoor Office",
  "description": "Multiple people working at desks with computers",
  "number_of_people": 5,
  "threats": null,
  "is_anomaly": false,
  "anomaly_reason": null,
  "analysis_id": "optional-id-for-update"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1707234567890",
    "environment": "Indoor Office",
    "description": "Multiple people working at desks with computers",
    "number_of_people": 5,
    "threats": null,
    "is_anomaly": false,
    "anomaly_reason": null,
    "created_at": "2024-02-06T12:00:00.000Z",
    "updated_at": "2024-02-06T12:00:00.000Z"
  }
}
```

### 2. Record Timestamp

**Endpoint:** `POST http://localhost:3001/api/record-timestamp`

**Description:** Record processing timestamps for various events.

**Event IDs:**
- `0` - Image Capture
- `1` - Gaussian Splatting Complete
- `2` - Image Processed

**Request Body:**
```json
{
  "id": 0,
  "time": 1707234567890,
  "analysis_id": "optional-analysis-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1707234567890",
    "event_id": 0,
    "timestamp_ms": 1707234567890,
    "analysis_id": null,
    "created_at": "2024-02-06T12:00:00.000Z"
  }
}
```

### 3. Capture and Process Images (External Server)

**Endpoint:** `POST http://localhost:3005/images`

**Description:** This endpoint is on a SEPARATE external processing server (not the local server). Called automatically when the "Capture Image" button is pressed. Receives both camera images as base64-encoded JPEG data, processes them, and returns complete analysis results including timings. The processing includes image capture, Gaussian splatting, and AI-powered scene analysis.

**Request Body:**
```json
{
  "camera1_image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...",
  "camera2_image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
}
```

**Response:**
```json
{
  "images_captured_time": 178,
  "gaussian_splatting_time": 1234,
  "processing_time": 567,
  "total_time": 1979,
  "ply_file_url": "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/ply/ascii/dolphins.ply",
  "environment": "Urban street",
  "activity": "People walking normally in an orderly fashion. Some individuals are checking their phones...",
  "people_count": 8,
  "threats": "None detected",
  "is_anomaly": false,
  "anomaly_reason": "Normal activity for this environment with expected patterns and behavior",
  "captured_at": "2024-02-06T12:00:00.000Z"
}
```

**Response Fields:**
- `images_captured_time` - Time taken to capture images (ms)
- `gaussian_splatting_time` - Time taken for 3D reconstruction (ms)
- `processing_time` - Time taken for AI analysis (ms)
- `total_time` - Total processing time (ms)
- `ply_file_url` - URL to the generated 3D model
- `environment` - Detected environment type
- `activity` - Detailed activity description
- `people_count` - Number of people detected
- `threats` - Identified threats or "None detected"
- `is_anomaly` - Boolean indicating if anomaly detected
- `anomaly_reason` - Explanation of anomaly status
- `captured_at` - Timestamp when processing completed

**Behavior:**
- The endpoint processes images and returns analysis results
- Frontend waits up to **10 seconds** for response
- **If response is not received within 10 seconds OR any fields are missing, stock values are used ONLY for the missing fields**
- Each missing field is individually replaced with a generated stock value
- The camera images are always saved locally regardless of the external server response

**Notes:**
- Images are captured as base64-encoded data URLs from the live camera feeds
- If camera access is unavailable, fallback stock images are used
- Processing includes Gaussian splatting for 3D reconstruction
- AI analysis powered by Qwen 7b edge model (simulated)
- The system gracefully handles partial responses by filling in only missing values

### 4. Refresh 3D Model

**Endpoint:** `POST http://localhost:3001/api/refresh-model`

**Description:** Refresh the 3D model view with a folder name.

**Request Body:**
```json
{
  "folder_name": "scan_001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1707234567890",
    "folder_name": "scan_001",
    "model_url": "/scan_001/output.ply",
    "extension": ".ply",
    "created_at": "2024-02-06T12:00:00.000Z",
    "message": "Model URL prepared for refresh"
  }
}
```

## GET Endpoints (for retrieving data)

### Get All Analyses
`GET http://localhost:3001/api/analyses`

### Get All Timestamps
`GET http://localhost:3001/api/timestamps`

### Get All Models
`GET http://localhost:3001/api/models`

### Health Check
`GET http://localhost:3001/health`

## Data Storage

All data is stored in JSON files in the `server/data/` directory:
- `analysis.json` - Analysis data
- `timestamps.json` - Processing timestamps
- `models.json` - Model paths

The directory is created automatically when the server starts.
