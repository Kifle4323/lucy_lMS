import { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function FaceCapture({ onCapture, capturedImage, profileImage }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraActive(true);
      setError('');
    } catch (err) {
      setError('Could not access camera. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      onCapture(imageData);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    onCapture(null);
    startCamera();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5 text-primary-600" />
        Face Verification
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Profile Image Reference */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Your Profile Photo</p>
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="w-full h-48 object-cover rounded-lg border border-gray-200"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-sm">No profile photo</p>
            </div>
          )}
        </div>

        {/* Camera / Captured Image */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Capture Your Face</p>
          {capturedImage ? (
            <div className="relative">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-48 object-cover rounded-lg border-2 border-green-500"
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                <CheckCircle className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={retakePhoto}
                className="mt-2 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retake Photo
              </button>
            </div>
          ) : cameraActive ? (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={capturePhoto}
                className="mt-2 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture Photo
              </button>
            </div>
          ) : (
            <div className="w-full h-48 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
              <Camera className="w-8 h-8 text-gray-400 mb-2" />
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg"
              >
                Start Camera
              </button>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Your face will be verified against your profile photo for exam security.
        </p>
      </div>
    </div>
  );
}
