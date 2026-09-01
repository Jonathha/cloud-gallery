import React from 'react';
import { Smartphone, Battery, BatteryCharging, Power, Camera } from 'lucide-react';
import { DeviceState } from './types';

interface ControllingSessionViewProps {
  remoteId: string;
  remoteState: DeviceState;
  setRemoteState: React.Dispatch<React.SetStateAction<DeviceState | null>>;
  sendCommand: (command: string, payload?: any) => void;
}

export function ControllingSessionView({
  remoteId,
  remoteState,
  setRemoteState,
  sendCommand,
}: ControllingSessionViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center p-4 bg-zinc-950 rounded-2xl border border-white/5 text-center gap-3">
        <div className="p-3 bg-zinc-900 rounded-full text-zinc-300">
          <Smartphone size={24} />
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Acesso Remoto</p>
          <p className="text-sm font-mono font-bold text-white mt-1">{remoteId}</p>
        </div>
        <div className="flex items-center justify-center gap-4 w-full pt-2">
          <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-xl border border-white/5">
            {remoteState.isCharging ? <BatteryCharging size={14} className="text-emerald-400" /> : <Battery size={14} className="text-zinc-400" />}
            <span className="text-[10px] font-mono font-bold text-zinc-300">{remoteState.batteryLevel}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => sendCommand(remoteState.isShuttingDown ? 'WAKEUP' : 'SHUTDOWN')}
          className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 h-24 ${
            remoteState.isShuttingDown ? 'bg-zinc-900 border-white/10 text-white' : 'bg-red-500/5 border-red-500/15 text-red-400'
          }`}
        >
          <Power size={20} />
          <span className="text-xs font-bold">{remoteState.isShuttingDown ? 'Desbloquear' : 'Bloquear'}</span>
        </button>

        <button
          onClick={() => sendCommand('TOGGLE_CAMERA', { active: !remoteState.isCameraActive })}
          className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 h-24 ${
            remoteState.isCameraActive ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' : 'bg-zinc-900 border-white/5 text-zinc-300'
          }`}
        >
          <Camera size={20} />
          <span className="text-xs font-bold">{remoteState.isCameraActive ? 'Ocultar Câmera' : 'Ver Câmera'}</span>
        </button>
      </div>

      <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 space-y-4">
        <div className="flex flex-col text-center space-y-1">
          <span className="text-xs font-bold text-white">Travar em um App</span>
          <p className="text-[10px] text-zinc-500">Restringe o uso a apenas um aplicativo</p>
        </div>
        
        <div className="flex flex-col gap-3">
          {!remoteState.pinAppEnabled && (
            <select
              value={remoteState.pinnedAppName}
              onChange={(e) => setRemoteState(prev => prev ? { ...prev, pinnedAppName: e.target.value } : null)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-center text-white focus:outline-none"
            >
              <option value="App Seguro">App Seguro</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Banco">Banco</option>
              <option value="Galeria">Galeria</option>
            </select>
          )}
          <button
            onClick={() => sendCommand('PIN_APP', { enabled: !remoteState.pinAppEnabled, appName: remoteState.pinnedAppName })}
            className={`w-full py-3 text-xs font-bold rounded-xl border transition-colors ${
              remoteState.pinAppEnabled ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-white text-black'
            }`}
          >
            {remoteState.pinAppEnabled ? 'Desativar Trava' : 'Ativar Trava'}
          </button>
        </div>
      </div>

      <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 space-y-3">
        <div className="text-center space-y-1 mb-4">
          <span className="text-xs font-bold text-white">Bloqueio de Apps</span>
          <p className="text-[10px] text-zinc-500">Impedir a abertura de aplicativos</p>
        </div>

        <div className="space-y-2">
          {Object.entries(remoteState.blockedApps).map(([appName, isBlocked]) => (
            <div key={appName} className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl border border-white/5">
              <span className="text-xs font-semibold text-zinc-300">{appName}</span>
              <button
                onClick={() => sendCommand('BLOCK_APP', { appName, blocked: !isBlocked })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  isBlocked ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-800 text-zinc-400 border border-transparent'
                }`}
              >
                {isBlocked ? 'Bloqueado' : 'Permitido'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
