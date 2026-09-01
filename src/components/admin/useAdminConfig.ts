import { useState, useEffect } from 'react';
import { dbPrimary } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

import { recordAuditEvent } from '../../services/adminAuditService';

export function useAdminConfig(
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void,
  onBackToGallery?: () => void
) {
  const { user } = useAuth();
  const isAdmin = user?.email === 'jogonesteterp@gmail.com';

  const [version, setVersion] = useState('2.1');
  const [buildNumber, setBuildNumber] = useState('210');
  const [required, setRequired] = useState(true);
  const [securityCode, setSecurityCode] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      if (onBackToGallery) {
        onBackToGallery();
      }
      return;
    }

    recordAuditEvent({
      type: 'admin_access',
      userId: user?.uid || 'admin',
      userEmail: user?.email || 'jogonesteterp@gmail.com',
      details: 'Acesso ao painel administrativo (AdminTab)'
    });

    async function loadConfig() {
      try {
        const configRef = doc(dbPrimary, 'config', 'app');
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.version !== undefined) setVersion(data.version);
          if (data.buildNumber !== undefined) setBuildNumber(data.buildNumber);
          if (data.required !== undefined) setRequired(!!data.required);
          if (data.securityCode !== undefined) setSecurityCode(data.securityCode || '');
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de atualização:', err);
        showToast('Não foi possível carregar as configurações do banco.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [isAdmin, onBackToGallery]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('Acesso negado: você não tem permissão para esta ação.', 'error');
      return;
    }

    if (!version.trim()) {
      showToast('Por favor, digite uma versão válida (ex: 2.1).', 'error');
      return;
    }

    if (!buildNumber.trim()) {
      showToast('Por favor, digite um build number válido (ex: 210).', 'error');
      return;
    }

    setSaving(true);
    try {
      const configRef = doc(dbPrimary, 'config', 'app');
      await setDoc(configRef, {
        version: version.trim(),
        minVersion: version.trim(), // back-compat
        buildNumber: buildNumber.trim(),
        required,
        securityCode: securityCode.trim()
      }, { merge: true });

      showToast('Configurações de atualização salvas com sucesso!');
      recordAuditEvent({
        type: 'admin_action',
        userId: user?.uid,
        userEmail: user?.email || '',
        details: `Atualização de configurações: Versão ${version.trim()}, Build ${buildNumber.trim()}, Obrigatório: ${required ? 'Sim' : 'Não'}`
      });
    } catch (err) {
      console.error('Erro ao salvar configurações de atualização:', err);
      showToast('Erro ao gravar configurações no banco de dados.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return {
    isAdmin,
    version,
    setVersion,
    buildNumber,
    setBuildNumber,
    required,
    setRequired,
    securityCode,
    setSecurityCode,
    loading,
    saving,
    handleSave
  };
}
