import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { APP_VERSION } from '../../constants';
import { fetchAppConfigApi, saveAppConfigApi } from '../../services/vaultApiService';
import { recordAuditEvent } from '../../services/adminAuditService';

export function useAdminConfig(
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void,
  onBackToGallery?: () => void
) {
  const { user } = useAuth();
  const isAdmin = user?.email === 'jogonesteterp@gmail.com';

  const [version, setVersion] = useState(APP_VERSION);
  const [buildNumber, setBuildNumber] = useState('100');
  const [required, setRequired] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [apkUrl, setApkUrl] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const onBackRef = useRef(onBackToGallery);
  onBackRef.current = onBackToGallery;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    if (!isAdmin) {
      if (onBackRef.current) {
        onBackRef.current();
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
        const data = await fetchAppConfigApi();
        if (data) {
          if (data.version !== undefined) setVersion(data.version);
          else if (data.latestVersion !== undefined) setVersion(data.latestVersion);
          if (data.buildNumber !== undefined) setBuildNumber(data.buildNumber);
          if (data.required !== undefined) setRequired(!!data.required);
          if (data.securityCode !== undefined) setSecurityCode(data.securityCode || '');
          if (data.apkUrl !== undefined) setApkUrl(data.apkUrl || '');
        }
      } catch (err) {
        console.error('Erro ao carregar configurações de atualização:', err);
        showToastRef.current('Não foi possível carregar as configurações do banco.', 'error');
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [isAdmin]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !user) {
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
      const ok = await saveAppConfigApi(user, {
        version: version.trim(),
        minVersion: version.trim(), // back-compat
        latestVersion: version.trim(),
        buildNumber: buildNumber.trim(),
        required,
        securityCode: securityCode.trim(),
        apkUrl: apkUrl.trim()
      });

      if (!ok) {
        throw new Error('Falha ao salvar configuração via API');
      }

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
    apkUrl,
    setApkUrl,
    loading,
    saving,
    handleSave
  };
}
