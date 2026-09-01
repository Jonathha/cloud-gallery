import { useEffect, useRef } from 'react';
import { db } from '../../../lib/firebase';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { DeviceState } from './types';

interface UseSessionListenersProps {
  user: any;
  mode: 'idle' | 'controlling' | 'controlled';
  setMode: React.Dispatch<React.SetStateAction<'idle' | 'controlling' | 'controlled'>>;
  connState: 'idle' | 'generating' | 'waiting' | 'requesting' | 'connected';
  setConnState: React.Dispatch<React.SetStateAction<'idle' | 'generating' | 'waiting' | 'requesting' | 'connected'>>;
  myCode: string;
  setMyCode: React.Dispatch<React.SetStateAction<string>>;
  inputCode: string;
  setInputCode: React.Dispatch<React.SetStateAction<string>>;
  deviceId: string;
  setRemoteId: React.Dispatch<React.SetStateAction<string>>;
  setPendingRequest: React.Dispatch<React.SetStateAction<{ id: string; code: string; email?: string; uid?: string } | null>>;
  setRemoteState: React.Dispatch<React.SetStateAction<DeviceState | null>>;
  localState: DeviceState;
  handleReceivedCommand: (command: string, payload: any) => void;
  cleanupConnection: () => Promise<void>;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function useSessionListeners({
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
}: UseSessionListenersProps) {
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const processedCommandsRef = useRef<Set<string>>(new Set());

  const attachControlledListener = (code: string) => {
    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = onSnapshot(doc(db, 'remote_sessions', code), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      
      if (data.status === 'requesting' && data.controllerId) {
        setPendingRequest({ 
          id: data.controllerId, 
          code,
          email: data.controllerEmail,
          uid: data.controllerUid
        });
        setConnState('requesting');
        try { navigator.vibrate?.([100, 50, 100]); } catch(e){}
      }
      
      if (data.status === 'connected' && data.commandQueue) {
        const queue = data.commandQueue as any[];
        queue.forEach(cmd => {
          if (!processedCommandsRef.current.has(cmd.id)) {
            processedCommandsRef.current.add(cmd.id);
            handleReceivedCommand(cmd.command, cmd.payload);
          }
        });
      }
    });
  };

  const attachControllingListener = (code: string) => {
    if (unsubscribeRef.current) unsubscribeRef.current();
    unsubscribeRef.current = onSnapshot(doc(db, 'remote_sessions', code), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      
      if (data.status === 'connected') {
        setMode(prev => {
          if (prev !== 'controlling') showToast('Conectado com sucesso!', 'success');
          return 'controlling';
        });
        setConnState('connected');
        setRemoteId(data.controlledId);
        if (data.state) setRemoteState(data.state as DeviceState);
      } else if (data.status === 'waiting') {
        cleanupConnection();
        showToast('Conexão recusada', 'error');
      }
      
      if (data.state && data.status === 'connected') {
        setRemoteState(data.state as DeviceState);
      }
    });
  };

  useEffect(() => {
    const restoreSession = async () => {
      const uid = user?.uid;
      if (!uid) return;

      try {
        const qCreator = query(collection(db, 'remote_sessions'), where('creatorId', '==', uid));
        const snapCreator = await getDocs(qCreator);
        
        let restored = false;
        snapCreator.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === 'connected' || data.status === 'waiting' || data.status === 'requesting') {
            setMyCode(data.code);
            setMode('controlled');
            setConnState(data.status);
            if (data.controllerId) setRemoteId(data.controllerId);
            restored = true;
            attachControlledListener(data.code);
          }
        });
        
        if (restored) return;

        const qController = query(collection(db, 'remote_sessions'), where('controllerUid', '==', uid));
        const snapController = await getDocs(qController);
        
        snapController.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === 'connected') {
            setInputCode(data.code);
            setMode('controlling');
            setConnState('connected');
            setRemoteId(data.controlledId);
            if (data.state) setRemoteState(data.state as DeviceState);
            attachControllingListener(data.code);
          }
        });
      } catch (err) {
        console.error('Failed to restore session:', err);
      }
    };
    
    if (user) {
      restoreSession();
    }
  }, [user]);

  useEffect(() => {
    if (mode === 'controlled' && connState === 'connected' && myCode) {
      updateDoc(doc(db, 'remote_sessions', myCode), {
        state: localState
      }).catch(console.error);
    }
  }, [localState, mode, connState, myCode]);

  return {
    unsubscribeRef,
    attachControlledListener,
    attachControllingListener,
  };
}
