import { useState, useEffect, useRef } from "react";
import { DeviceState } from "./types";

export function useLocalDeviceState(showToast: (msg: string, type: 'success' | 'error' | 'info') => void) {
  const [localState, setLocalState] = useState<DeviceState>({
    batteryLevel: 87,
    isCharging: false,
    pinAppEnabled: false,
    pinnedAppName: 'App Seguro',
    blockedApps: {
      'WhatsApp': false,
      'Instagram': false,
      'Banco': false,
      'Galeria': false
    },
    isCameraActive: false,
    isShuttingDown: false
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');

  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBatteryInfo = () => {
          setLocalState(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100),
            isCharging: battery.charging
          }));
        };
        updateBatteryInfo();
        battery.addEventListener('levelchange', updateBatteryInfo);
        battery.addEventListener('chargingchange', updateBatteryInfo);
        return () => {
          battery.removeEventListener('levelchange', updateBatteryInfo);
          battery.removeEventListener('chargingchange', updateBatteryInfo);
        };
      });
    } else {
      const interval = setInterval(() => {
        setLocalState(prev => ({
          ...prev, 
          batteryLevel: prev.batteryLevel > 1 ? prev.batteryLevel - 1 : 100
        }));
      }, 60000);
      return () => clearInterval(interval);
    }
  }, []);

  const startLocalCamera = async () => {
    try {
      setCameraError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError('Câmera indisponível.');
      setLocalState(prev => ({ ...prev, isCameraActive: false }));
    }
  };

  const stopLocalCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleReceivedCommand = (command: string, payload: any) => {
    switch (command) {
      case 'SHUTDOWN':
        setLocalState(prev => ({ ...prev, isShuttingDown: true }));
        showToast('Dispositivo bloqueado remotamente', 'info');
        break;
      case 'WAKEUP':
        setLocalState(prev => ({ ...prev, isShuttingDown: false }));
        break;
      case 'PIN_APP':
        setLocalState(prev => ({ 
          ...prev, 
          pinAppEnabled: payload.enabled,
          pinnedAppName: payload.appName || prev.pinnedAppName
        }));
        showToast(payload.enabled ? 'Modo restrito ativado' : 'Modo restrito desativado', 'info');
        break;
      case 'BLOCK_APP':
        setLocalState(prev => ({
          ...prev,
          blockedApps: {
            ...prev.blockedApps,
            [payload.appName]: payload.blocked
          }
        }));
        break;
      case 'TOGGLE_CAMERA':
        setLocalState(prev => ({ ...prev, isCameraActive: payload.active }));
        if (payload.active) {
          startLocalCamera();
        } else {
          stopLocalCamera();
        }
        break;
    }
  };

  return {
    localState,
    setLocalState,
    videoRef,
    cameraError,
    setCameraError,
    startLocalCamera,
    stopLocalCamera,
    handleReceivedCommand,
  };
}
