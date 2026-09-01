import React from 'react';
import { ControlTabProps } from './control/types';
import { ControlHeader } from './control/ControlHeader';
import { DevicePairingSection } from './control/DevicePairingSection';
import { ControlledSessionView } from './control/ControlledSessionView';
import { ControllingSessionView } from './control/ControllingSessionView';
import { useControlSession } from './control/useControlSession';

export default function ControlTab({ showToast }: ControlTabProps) {
  const {
    deviceId,
    mode,
    connState,
    myCode,
    inputCode,
    setInputCode,
    pendingRequest,
    remoteId,
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
  } = useControlSession({ showToast });

  return (
    <div className="space-y-6 text-white pb-6">
      <ControlHeader />

      <div className="p-4 sm:p-6 bg-zinc-900/50 border border-white/10 rounded-3xl space-y-6 w-full max-w-md mx-auto">
        {mode === 'idle' && (
          <DevicePairingSection
            deviceId={deviceId}
            inputCode={inputCode}
            setInputCode={setInputCode}
            onGenerateCode={generateCode}
            onConnect={handleConnect}
          />
        )}

        {mode === 'controlled' && (
          <ControlledSessionView
            connState={connState}
            myCode={myCode}
            pendingRequest={pendingRequest}
            remoteId={remoteId}
            localState={localState}
            videoRef={videoRef}
            cameraError={cameraError}
            onCancel={cleanupConnection}
            onAccept={acceptConnection}
            onReject={rejectConnection}
          />
        )}

        {mode === 'controlling' && remoteState && (
          <ControllingSessionView
            remoteId={remoteId}
            remoteState={remoteState}
            setRemoteState={setRemoteState}
            sendCommand={sendCommand}
          />
        )}
      </div>
    </div>
  );
}
