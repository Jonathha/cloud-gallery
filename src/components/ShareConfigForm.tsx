import React from 'react';
import { Clock, Key, Download, Eye, Loader2, Sparkles, Check } from 'lucide-react';

interface ShareConfigFormProps {
  /**
   * Safe Link lease times ('1h' | 'permanent')
   */
  linkDuration: '1h' | 'permanent';
  /**
   * Action of toggling security limits
   */
  setLinkDuration: (duration: '1h' | 'permanent') => void;
  /**
   * Expose require password locks checkbox
   */
  requirePassword: boolean;
  /**
   * Set flag of requiring password
   */
  setRequirePassword: (value: boolean) => void;
  /**
   * State sequence password input
   */
  password: string;
  /**
   * Setter for custom password
   */
  setPassword: (value: string) => void;
  /**
   * Allow user to download decrypted content
   */
  allowDownload: boolean;
  /**
   * Change allowDownload preference
   */
  setAllowDownload: (value: boolean) => void;
  /**
   * Restrict access token to a one-off viewer window
   */
  oneTimeView: boolean;
  /**
   * Toggle single open permissions
   */
  setOneTimeView: (value: boolean) => void;
  /**
   * Trigger state of server response
   */
  loading: boolean;
  /**
   * Close host prompt callback
   */
  onClose: () => void;
  /**
   * Initiate cryptographically secure lease record
   */
  onGenerate: () => void;
}

/**
 * ShareConfigForm provides the form controls for creating a new secure sharing link.
 * Allows options like setting duration limits, setting password protection,
 * allowing downloads, and enabling one-time view mode.
 */
export default function ShareConfigForm({
  linkDuration,
  setLinkDuration,
  requirePassword,
  setRequirePassword,
  password,
  setPassword,
  allowDownload,
  setAllowDownload,
  oneTimeView,
  setOneTimeView,
  loading,
  onClose,
  onGenerate
}: ShareConfigFormProps) {
  return (
    <div id="share-config-form" className="flex flex-col gap-4 text-left">
      {/* Duration selection region */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
          <Clock size={14} /> Duração do Link
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setLinkDuration('1h')}
            className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
              linkDuration === '1h' 
                ? 'bg-white text-black border-white' 
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            Expirar em 1 Hora
          </button>
          <button
            type="button"
            onClick={() => setLinkDuration('permanent')}
            className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
              linkDuration === 'permanent' 
                ? 'bg-white text-black border-white' 
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
            }`}
          >
            Link Permanente
          </button>
        </div>
      </div>

      {/* Password protection options card */}
      <div className="flex flex-col gap-2 p-3 bg-zinc-900 border border-zinc-850 rounded-xl">
        <label className="flex items-center justify-between text-xs font-semibold text-zinc-300 cursor-pointer select-none">
          <span className="flex items-center gap-1.5">
            <Key size={14} /> Exigir Senha de Segurança
          </span>
          <div className="relative flex items-center">
            <input 
              type="checkbox"
              checked={requirePassword}
              onChange={(e) => setRequirePassword(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
              requirePassword 
                ? 'bg-white border-white text-black' 
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}>
              {requirePassword && <Check size={12} strokeWidth={3.5} className="text-black" />}
            </div>
          </div>
        </label>
        
        {requirePassword && (
          <div className="mt-2 flex flex-col gap-1">
            <input 
              type="password" 
              placeholder="Senha de 6+ dígitos..." 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
            />
            <span className="text-[10px] text-zinc-500 font-normal">
              O visitante precisará colocar esta senha exata para descriptografar e ver a imagem.
            </span>
          </div>
        )}
      </div>

      {/* Download and single view switches block */}
      <div className="grid grid-cols-1 gap-2">
        <label className={`flex items-center justify-between p-3 bg-zinc-900 border border-zinc-850 rounded-xl text-xs font-semibold text-zinc-300 select-none ${oneTimeView ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
          <span className="flex items-center gap-1.5">
            <Download size={14} /> Permitir Download de Imagem
          </span>
          <div className="relative flex items-center">
            <input 
              type="checkbox"
              disabled={oneTimeView}
              checked={oneTimeView ? false : allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
              oneTimeView 
                ? 'bg-zinc-950/50 border-zinc-900' 
                : allowDownload
                  ? 'bg-white border-white text-black' 
                  : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}>
              {!oneTimeView && allowDownload && <Check size={12} strokeWidth={3.5} className="text-black" />}
            </div>
          </div>
        </label>

        <label className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-850 rounded-xl text-xs font-semibold text-zinc-300 cursor-pointer select-none">
          <span className="flex items-center gap-1.5">
            <Eye size={14} /> Visualização Única (1 min)
          </span>
          <div className="relative flex items-center">
            <input 
              type="checkbox"
              checked={oneTimeView}
              onChange={(e) => setOneTimeView(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
              oneTimeView 
                ? 'bg-white border-white text-black' 
                : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
            }`}>
              {oneTimeView && <Check size={12} strokeWidth={3.5} className="text-black" />}
            </div>
          </div>
        </label>
        
        {oneTimeView && (
          <div className="text-[10px] text-zinc-500 px-3 py-1 font-normal">
            🔒 O primeiro visitante poderá ver por até 1 minuto. Na mesma sessão, o IP ficará locked. Em seguida, o link é permanentemente inutilizado.
          </div>
        )}
      </div>

      {/* Cancel and Action Buttons */}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-sm font-semibold"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin text-black" />
          ) : (
            <>
              <Sparkles size={16} /> Gerar Link
            </>
          )}
        </button>
      </div>
    </div>
  );
}
