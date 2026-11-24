import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { VaultEncryptionMode, validateVaultSetup } from './vaultSetup/types';
import { VaultSetupHeader } from './vaultSetup/VaultSetupHeader';
import { VaultSetupPinSection } from './vaultSetup/VaultSetupPinSection';
import { VaultSetupModeSection } from './vaultSetup/VaultSetupModeSection';
import { VaultSetupActions } from './vaultSetup/VaultSetupActions';

export default function VaultSetup() {
  const { setupVault, logOut } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [mode, setMode] = useState<VaultEncryptionMode>('standard');
  const [extraPassword, setExtraPassword] = useState('');
  const [confirmExtraPassword, setConfirmExtraPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [showConfirmExtra, setShowConfirmExtra] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    const validation = validateVaultSetup(pin, confirmPin, mode, extraPassword, confirmExtraPassword);
    if (!validation.valid) {
      setError(validation.error || 'Dados inválidos');
      return;
    }
    setLoading(true);
    try {
      await setupVault(pin, mode === 'custom_extra' ? extraPassword.trim() : null, mode);
    } catch (err: any) {
      setError(err?.message || 'Falha ao configurar o cofre. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 sm:p-6 text-zinc-100 font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-6 my-auto">
        <VaultSetupHeader />
        <form onSubmit={handleSubmit} className="space-y-6">
          <VaultSetupPinSection pin={pin} setPin={setPin} confirmPin={confirmPin} setConfirmPin={setConfirmPin} showPin={showPin} setShowPin={setShowPin} showConfirmPin={showConfirmPin} setShowConfirmPin={setShowConfirmPin} loading={loading} />
          <VaultSetupModeSection mode={mode} setMode={setMode} extraPassword={extraPassword} setExtraPassword={setExtraPassword} confirmExtraPassword={confirmExtraPassword} setConfirmExtraPassword={setConfirmExtraPassword} showExtra={showExtra} setShowExtra={setShowExtra} showConfirmExtra={showConfirmExtra} setShowConfirmExtra={setShowConfirmExtra} loading={loading} />
          <VaultSetupActions error={error} loading={loading} onCancel={logOut} />
        </form>
      </motion.div>
    </div>
  );
}
