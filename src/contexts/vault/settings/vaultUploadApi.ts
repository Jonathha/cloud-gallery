import { User } from 'firebase/auth';
import { getApiUrl } from '../../../utils/apiUrl';
import { getSafeAuthToken } from '../../../utils/safeAuthToken';

/**
 * Envia o payload de reversão da imagem desprotegida para o endpoint de upload
 */
export async function uploadRevertedImagePayload(
  payload: Record<string, any>,
  user: User
): Promise<void> {
  const token = await getSafeAuthToken(user);
  await fetch(getApiUrl('/api/storage/upload'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

/**
 * Envia o payload da mídia protegida e criptografada para o servidor
 */
export async function uploadProtectedImagePayload(
  payload: Record<string, any>,
  user: User
): Promise<void> {
  const token = await getSafeAuthToken(user);
  const uploadRes = await fetch(getApiUrl('/api/storage/upload'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!uploadRes.ok) {
    throw new Error('Erro ao salvar imagem protegida');
  }
}
