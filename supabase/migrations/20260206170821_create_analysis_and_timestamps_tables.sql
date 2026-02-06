/*
  # Create Analysis and Timestamps Tables

  1. New Tables
    - `analysis_data`
      - `id` (uuid, primary key) - Unique identifier for each analysis
      - `environment` (text) - Environment description (1-4 words)
      - `description` (text) - Detailed description (up to 20 words)
      - `number_of_people` (integer) - Count of people detected
      - `threats` (text, nullable) - Identified threats if any
      - `is_anomaly` (boolean) - Whether an anomaly was detected
      - `anomaly_reason` (text, nullable) - Reason for anomaly if detected
      - `created_at` (timestamptz) - When the record was created
      - `updated_at` (timestamptz) - When the record was last updated
    
    - `processing_timestamps`
      - `id` (uuid, primary key)
      - `analysis_id` (uuid, foreign key) - References analysis_data
      - `event_id` (integer) - 0: image capture, 1: Gaussian Splatting Complete, 2: Image Processed
      - `timestamp_ms` (bigint) - Time in milliseconds
      - `created_at` (timestamptz) - When the record was created
  
  2. Security
    - Enable RLS on both tables
    - Add policies for public access (since external systems will call these)
*/

-- Create analysis_data table
CREATE TABLE IF NOT EXISTS analysis_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL,
  description text NOT NULL,
  number_of_people integer DEFAULT 0,
  threats text,
  is_anomaly boolean DEFAULT false,
  anomaly_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create processing_timestamps table
CREATE TABLE IF NOT EXISTS processing_timestamps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES analysis_data(id) ON DELETE CASCADE,
  event_id integer NOT NULL CHECK (event_id IN (0, 1, 2)),
  timestamp_ms bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_processing_timestamps_analysis_id ON processing_timestamps(analysis_id);
CREATE INDEX IF NOT EXISTS idx_processing_timestamps_event_id ON processing_timestamps(event_id);

-- Enable RLS
ALTER TABLE analysis_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_timestamps ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for external systems)
CREATE POLICY "Allow public read access to analysis_data"
  ON analysis_data FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to analysis_data"
  ON analysis_data FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to analysis_data"
  ON analysis_data FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to processing_timestamps"
  ON processing_timestamps FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to processing_timestamps"
  ON processing_timestamps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
