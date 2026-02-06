# API Documentation

This project includes a simple Express API server with file-based storage.

## Starting the Server

```bash
npm run server
```

The server runs on port 3001 by default.

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

### 3. Capture Images

**Endpoint:** `POST http://localhost:3001/api/capture-images`

**Description:** Called automatically when the "Capture Image" button is pressed. Receives both camera images as JSON.

**Request Body:**
```json
{
  "camera1_url": "https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg",
  "camera2_url": "https://images.pexels.com/photos/2881233/pexels-photo-2881233.jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "camera1_url": "https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg",
    "camera2_url": "https://images.pexels.com/photos/2881233/pexels-photo-2881233.jpeg",
    "captured_at": "2024-02-06T12:00:00.000Z"
  },
  "message": "Images captured successfully"
}
```

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
