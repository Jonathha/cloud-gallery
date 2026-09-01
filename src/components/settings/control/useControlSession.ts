import { useState } from 'react';
import { db } from '../../../lib/firebase';
import { doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { DeviceState } from './types';
import { useLocalDeviceState } from './useLocalDeviceState';
import { useSessionListeners } from './useSessionListeners';

interface UseControlSessionProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function useControlSession({ showToast }: UseControlSessionProps) {
  const { user } = useAuth();
  const [deviceId] = useState(() => 'DEV-' + Math.random().toString(36).substring(2, 6).toUpperCase());
  
  const [mode, setMode] = useState<'idle' | 'controlling' | 'controlled'>('idle');
  const [connState, setConnState] = useState<'idle' | 'generating' | 'waiting' | 'requesting' | 'connected'>('idle');
  
  const [myCode, setMyCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  
  const [remoteId, setRemoteId] = useState<string>('');
  const [pendingRequest, setPendingRequest] = useState<{ id: string; code: string; email?: string; uid?: string } | null>(null);

  const [remoteState, setRemoteState] = useState<DeviceState | null>(null);

  const {
    localState,
    setLocalState,
    videoRef,
    cameraError,
    stopLocalCamera,
    handleReceivedCommand,
  } = useLocalDeviceState(showToast);

  const cleanupConnection = async () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    const code = mode === 'controlling' ? inputCode : myCode;
    if (code && connState === 'waiting') {
      try {
        await updateDoc(doc(db, 'remote_sessions', code), {
          status: 'disconnected'
        });
      } catch (e) {}
    }

    stopLocalCamera();
    setMode('idle');
    setConnState('idle');
    setMyCode('');
    setInputCode('');
    setRemoteId('');
    setRemoteState(null);
    setPendingRequest(null);
    setLocalState(prev => ({
      ...prev,
      pinAppEnabled: false,
      isCameraActive: false,
      isShuttingDown: false
    }));
  };

  const {
    unsubscribeRef,
    attachControlledListener,
    attachControllingListener,
  } = useSessionListeners({
    user,
    mode,
    setMode,
    connState,
    setConnState,
    myCode,
    setMyCode,
    inputCode,
    setInputCode,
    deviceId,
    setRemoteId,
    setPendingRequest,
    setRemoteState,
    localState,
    handleReceivedCommand,
    cleanupConnection,
    showToast,
  });

  const generateCode = async () => {
    if (!user) {
      showToast('Você precisa estar logado', 'error');
      return;
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setMyCode(code);
    setMode('controlled');
    setConnState('waiting');
    
    try {
      await setDoc(doc(db, 'remote_sessions', code), {
        code,
        creatorId: user.uid,
        creatorEmail: user.email || 'anonymous',
        controlledId: deviceId,
        controllerId: null,
        status: 'waiting',
        state: localState,
        commandQueue: [],
        createdAt: new Date().toISOString()
      });

      attachControlledListener(code);
      showToast('Código gerado. Aguardando conexão.', 'info');
    } catch (error: any) {
      console.error('Error generating code:', error);
      showToast('Erro ao gerar sessão: ' + error.message, 'error');
      setMode('idle');
      setConnState('idle');
    }
  };

  const handleConnect = async () => {
    if (!user) {
      showToast('Você precisa estar logado', 'error');
      return;
    }
    const code = inputCode.trim().toUpperCase();
    if (code.length < 5) {
      showToast('Código inválido', 'error');
      return;
    }

    setConnState('waiting');
    
    try {
      const docRef = doc(db, 'remote_sessions', code);
      const snap = await getDoc(docRef);
      
      if (!snap.exists() || snap.data().status !== 'waiting') {
        showToast('Sessão não encontrada ou indisponível', 'error');
        setConnState('idle');
        return;
      }

      await updateDoc(docRef, {
        controllerId: deviceId,
        controllerUid: user.uid,
        controllerEmail: user.email || 'anonymous',
        status: 'requesting'
      });

      attachControllingListener(code);
    } catch (error: any) {
      console.error('Error connecting:', error);
      showToast('Erro ao conectar: ' + error.message, 'error');
      setConnState('idle');
    }
  };

  const acceptConnection = async () => {
    if (!pendingRequest) return;
    
    setRemoteId(pendingRequest.id);
    setMode('controlled');
    setConnState('connected');
    
    await updateDoc(doc(db, 'remote_sessions', myCode), {
      status: 'connected',
      state: localState
    });
    
    setPendingRequest(null);
    showToast('Acesso concedido', 'success');
  };

  const rejectConnection = async () => {
    if (!pendingRequest) return;

    await updateDoc(doc(db, 'remote_sessions', myCode), {
      status: 'waiting',
      controllerId: null
    });

    setPendingRequest(null);
    setConnState('waiting');
    showToast('Acesso negado', 'info');
  };

  const sendCommand = async (command: string, payload: any = {}) => {
    if (remoteId && inputCode) {
      const cmdId = Math.random().toString(36).substring(2, 9);
      await updateDoc(doc(db, 'remote_sessions', inputCode), {
        commandQueue: arrayUnion({
          id: cmdId,
          command,
          payload,
          timestamp: Date.now()
        })
      });

      setRemoteState(prev => {
        if (!prev) return null;
        switch (command) {
          case 'SHUTDOWN': return { ...prev, isShuttingDown: true };
          case 'WAKEUP': return { ...prev, isShuttingDown: false };
          case 'PIN_APP': return { ...prev, pinAppEnabled: payload.enabled, pinnedAppName: payload.appName || prev.pinnedAppName };
          case 'BLOCK_APP': return {
            ...prev,
            blockedApps: { ...prev.blockedApps, [payload.appName]: payload.blocked }
          };
          case 'TOGGLE_CAMERA': return { ...prev, isCameraActive: payload.active };
          default: return prev;
        }
      });
    }
  };

  return {
    deviceId,
    mode,
    connState,
    myCode,
    inputCode,
    setInputCode,
    remoteId,
    pendingRequest,
    localState,
    remoteState,
    setRemoteState,
    videoRef,
    cameraError,
    cleanupConnection,
    generateCode,
    handleConnect,
    acceptConnection,
    rejectConnection,
    sendCommand,
  };
}
