/*
  # Camera Captures and 3D Models Database Schema

  1. New Tables
    - `captures`
      - `id` (uuid, primary key) - Unique capture identifier
      - `timestamp` (timestamptz) - When capture was initiated
      - `camera1_url` (text) - URL to first camera image
      - `camera2_url` (text) - URL to second camera image
      - `ply_file_url` (text) - URL to generated PLY file
      - `images_captured_time` (integer) - Time in ms for image capture
      - `gaussian_splatting_time` (integer) - Time in ms for gaussian splatting
      - `processing_time` (integer) - Time in ms for processing
      - `total_time` (integer) - Total time in ms
      - `environment` (text) - Environment description
      - `activity` (text) - What is happening
      - `people_count` (integer) - Number of people detected
      - `threats` (text) - Threat assessment
      - `is_anomaly` (boolean) - Whether it's an anomaly
      - `anomaly_reason` (text) - Reason for anomaly classification
      - `status` (text) - Processing status: 'capturing', 'splatting', 'processing', 'complete'
      - `created_at` (timestamptz) - Record creation time

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access (since this is a demo system)
*/

CREATE TABLE IF NOT EXISTS captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  camera1_url text,
  camera2_url text,
  ply_file_url text,
  images_captured_time integer DEFAULT 0,
  gaussian_splatting_time integer DEFAULT 0,
  processing_time integer DEFAULT 0,
  total_time integer DEFAULT 0,
  environment text,
  activity text,
  people_count integer DEFAULT 0,
  threats text,
  is_anomaly boolean DEFAULT false,
  anomaly_reason text,
  status text DEFAULT 'capturing',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE captures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to captures"
  ON captures
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access to captures"
  ON captures
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access to captures"
  ON captures
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS captures_created_at_idx ON captures(created_at DESC);
CREATE INDEX IF NOT EXISTS captures_status_idx ON captures(status);