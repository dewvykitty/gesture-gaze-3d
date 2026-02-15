'use client';

import { useEffect, useRef, useState } from 'react';

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

  // Check permission state
  useEffect(() => {
    const checkPermission = async () => {
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setPermissionState(result.state);
          
          result.onchange = () => {
            setPermissionState(result.state);
          };
        } catch (e) {
          // Permissions API might not be supported or camera permission name might not be available
          console.log('Permission API not fully supported');
        }
      }
    };
    
    checkPermission();
  }, []);

  const startWebcam = async () => {
    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Multiple ways to detect when video is ready
        const checkReady = () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            // HAVE_CURRENT_DATA or higher
            setIsReady(true);
          }
        };

        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setIsReady(true);
            }).catch((err) => {
              console.error('Video play error:', err);
              // Still set ready if stream is active
              if (stream.active) {
                setIsReady(true);
              }
            });
          }
        };

        videoRef.current.oncanplay = () => {
          checkReady();
        };

        videoRef.current.onplaying = () => {
          setIsReady(true);
        };

        // Fallback: check after a short delay
        setTimeout(() => {
          if (stream.active && videoRef.current && videoRef.current.readyState >= 2) {
            setIsReady(true);
          }
        }, 500);
      }
    } catch (err) {
      let errorMessage = 'Failed to access webcam';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
          errorMessage = 'Camera permission denied. Please check your browser settings.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        } else {
          errorMessage = err.message || 'Failed to access webcam';
        }
      }
      
      setError(errorMessage);
      console.error('Webcam error:', err);
    }
  };

  useEffect(() => {
    startWebcam();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { videoRef, isReady, error, permissionState, retry: startWebcam };
}
