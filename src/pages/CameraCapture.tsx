import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Box, CheckCircle2, Loader2, AlertTriangle, Users, Eye } from 'lucide-react';

interface CaptureData {
  camera1_url: string | null;
  camera2_url: string | null;
  ply_file_url: string | null;
  images_captured_time: number;
  gaussian_splatting_time: number;
  processing_time: number;
  total_time: number;
  environment: string | null;
  activity: string | null;
  people_count: number;
  threats: string | null;
  is_anomaly: boolean;
  anomaly_reason: string | null;
}

export default function CameraCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentCapture, setCurrentCapture] = useState<CaptureData | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ step: 0, status: '' });
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const stream1Ref = useRef<MediaStream | null>(null);
  const stream2Ref = useRef<MediaStream | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    initializeCameras();
    broadcastRef.current = new BroadcastChannel('capture_channel');

    return () => {
      stopCameras();
      broadcastRef.current?.close();
    };
  }, []);

  const initializeCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      if (videoDevices.length >= 1) {
        const stream1 = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: videoDevices[0].deviceId }
        });
        if (video1Ref.current) {
          video1Ref.current.srcObject = stream1;
          stream1Ref.current = stream1;
        }
      }

      if (videoDevices.length >= 2) {
        const stream2 = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: videoDevices[1].deviceId }
        });
        if (video2Ref.current) {
          video2Ref.current.srcObject = stream2;
          stream2Ref.current = stream2;
        }
      } else if (videoDevices.length >= 1) {
        const stream2 = await navigator.mediaDevices.getUserMedia({ video: true });
        if (video2Ref.current) {
          video2Ref.current.srcObject = stream2;
          stream2Ref.current = stream2;
        }
      }
    } catch (error) {
      console.error('Error accessing cameras:', error);
      setCameraError('Unable to access cameras. Using simulated feeds.');
    }
  };

  const stopCameras = () => {
    if (stream1Ref.current) {
      stream1Ref.current.getTracks().forEach(track => track.stop());
    }
    if (stream2Ref.current) {
      stream2Ref.current.getTracks().forEach(track => track.stop());
    }
  };

  const startCapture = async () => {
    try {
      setIsCapturing(true);
      setCurrentCapture(null);
      setProgress({ step: 1, status: 'capturing' });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-capture`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start capture');
      }

      const result = await response.json();

      setCurrentCapture(result);
      setIsCapturing(false);

      localStorage.setItem('latest_capture', JSON.stringify(result));
      broadcastRef.current?.postMessage({ type: 'capture_complete', data: result });
    } catch (error) {
      console.error('Error starting capture:', error);
      setIsCapturing(false);
      alert('Failed to start capture. Please try again.');
    }
  };

  const getStatusIcon = (completed: boolean, inProgress: boolean) => {
    if (completed) return <CheckCircle2 className="text-green-400" size={16} />;
    if (inProgress) return <Loader2 className="text-blue-400 animate-spin" size={16} />;
    return <div className="w-4 h-4 rounded-full border-2 border-gray-600" />;
  };

  const isStepComplete = (step: number) => {
    if (!currentCapture) return false;
    if (step === 1) return currentCapture.images_captured_time > 0;
    if (step === 2) return currentCapture.gaussian_splatting_time > 0;
    if (step === 3) return currentCapture.processing_time > 0;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Realtime 3D Reconstruction and Video Analysis</h1>
            <p className="text-xs text-gray-400">Dual-camera capture with AI-powered scene analysis</p>
          </div>
          <Link
            to="/"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            <Box size={16} />
            Switch to 3D Model View
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="text-blue-400" size={16} />
              <h2 className="text-sm font-semibold text-white">Camera 1 - Live Feed</h2>
            </div>
            <video
              ref={video1Ref}
              autoPlay
              playsInline
              muted
              className="w-full h-40 bg-gray-700 rounded object-cover"
            />
            {cameraError && (
              <div className="text-xs text-yellow-400 mt-1">{cameraError}</div>
            )}
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="text-blue-400" size={16} />
              <h2 className="text-sm font-semibold text-white">Camera 2 - Live Feed</h2>
            </div>
            <video
              ref={video2Ref}
              autoPlay
              playsInline
              muted
              className="w-full h-40 bg-gray-700 rounded object-cover"
            />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 mb-3 border border-gray-700">
          <button
            onClick={startCapture}
            disabled={isCapturing}
            className={`w-full py-3 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-all ${
              isCapturing
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/50'
            }`}
          >
            {isCapturing ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing...
              </>
            ) : (
              <>
                <Camera size={20} />
                Capture Image
              </>
            )}
          </button>
        </div>

        {currentCapture && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="text-blue-400" size={14} />
                    <h2 className="text-xs font-semibold text-white">Camera 1</h2>
                  </div>
                  {currentCapture.camera1_url ? (
                    <img
                      src={currentCapture.camera1_url}
                      alt="Camera 1"
                      className="w-full h-32 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-700 rounded flex items-center justify-center">
                      <Loader2 className="animate-spin text-gray-500" size={24} />
                    </div>
                  )}
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="text-blue-400" size={14} />
                    <h2 className="text-xs font-semibold text-white">Camera 2</h2>
                  </div>
                  {currentCapture.camera2_url ? (
                    <img
                      src={currentCapture.camera2_url}
                      alt="Camera 2"
                      className="w-full h-32 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-700 rounded flex items-center justify-center">
                      <Loader2 className="animate-spin text-gray-500" size={24} />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
                <h2 className="text-sm font-semibold text-white mb-2">Processing Progress</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(isStepComplete(1), isCapturing && !isStepComplete(1))}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-xs">Images Captured</span>
                        {currentCapture.images_captured_time > 0 && (
                          <span className="text-green-400 font-mono text-xs">
                            {currentCapture.images_captured_time}ms
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isStepComplete(1) ? 'bg-green-400' : 'bg-blue-400'
                          }`}
                          style={{ width: isStepComplete(1) ? '100%' : '0%' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusIcon(isStepComplete(2), isCapturing && isStepComplete(1) && !isStepComplete(2))}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-xs">Gaussian Splatting Complete</span>
                        {currentCapture.gaussian_splatting_time > 0 && (
                          <span className="text-green-400 font-mono text-xs">
                            {currentCapture.gaussian_splatting_time}ms
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isStepComplete(2) ? 'bg-green-400' : 'bg-blue-400'
                          }`}
                          style={{ width: isStepComplete(2) ? '100%' : '0%' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusIcon(isStepComplete(3), isCapturing && isStepComplete(2) && !isStepComplete(3))}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-xs">Image Processed</span>
                        {currentCapture.processing_time > 0 && (
                          <span className="text-green-400 font-mono text-xs">
                            {currentCapture.processing_time}ms
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isStepComplete(3) ? 'bg-green-400' : 'bg-blue-400'
                          }`}
                          style={{ width: isStepComplete(3) ? '100%' : '0%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {currentCapture.total_time > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-700 text-center">
                    <span className="text-gray-400 text-xs">Total: </span>
                    <span className="text-lg font-bold text-blue-400 font-mono">
                      {currentCapture.total_time}ms
                    </span>
                  </div>
                )}
              </div>
            </div>

            {currentCapture.processing_time > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
                <h2 className="text-sm font-semibold text-white mb-2">Analysis Results</h2>
                <div className="space-y-2">
                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="text-blue-400" size={14} />
                      <h3 className="text-xs font-semibold text-white">Environment</h3>
                    </div>
                    <p className="text-gray-300 text-sm">{currentCapture.environment}</p>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Camera className="text-blue-400" size={14} />
                      <h3 className="text-xs font-semibold text-white">Activity</h3>
                    </div>
                    <textarea
                      readOnly
                      value={currentCapture.activity || ''}
                      className="w-full bg-gray-800 text-gray-300 text-sm rounded p-2 border border-gray-600 resize-none"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="text-blue-400" size={14} />
                        <h3 className="text-xs font-semibold text-white">People</h3>
                      </div>
                      <p className="text-gray-300 text-2xl font-bold">{currentCapture.people_count}</p>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="text-blue-400" size={14} />
                        <h3 className="text-xs font-semibold text-white">Threats</h3>
                      </div>
                      <p className="text-gray-300 text-xs">{currentCapture.threats}</p>
                    </div>
                  </div>

                  <div className={`rounded-lg p-3 ${
                    currentCapture.is_anomaly
                      ? 'bg-red-500/20 border border-red-500/50'
                      : 'bg-green-500/20 border border-green-500/50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle
                        className={currentCapture.is_anomaly ? 'text-red-400' : 'text-green-400'}
                        size={16}
                      />
                      <h3 className="text-xs font-semibold text-white">
                        {currentCapture.is_anomaly ? 'Anomaly Detected' : 'Normal Activity'}
                      </h3>
                    </div>
                    <p className="text-gray-300 text-xs">{currentCapture.anomaly_reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
