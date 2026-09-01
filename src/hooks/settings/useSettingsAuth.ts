export function useSettingsAuth(
  newExtraPassword: string,
  updateExtraPassword: (password: string) => Promise<void>,
  setIsUpdatingPassword: (updating: boolean) => void,
  showToast: (message: string, type?: any) => void
) {
  const handleUpdateExtraPassword = async (customPassword?: string) => {
    const passwordToUse = (customPassword !== undefined ? customPassword : newExtraPassword).trim();
    if (!passwordToUse) {
      showToast('A senha não pode estar vazia', 'error');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updateExtraPassword(passwordToUse);
      showToast('Senha de segurança atualizada com sucesso');
    } catch (error) {
      showToast('Erro ao atualizar senha de segurança', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return { handleUpdateExtraPassword };
}
