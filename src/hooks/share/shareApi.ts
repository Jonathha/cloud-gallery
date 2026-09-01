import { getApiUrl } from '../../utils/apiUrl';

export async function fetchImageShares(imageId: string, token: string) {
  const res = await fetch(getApiUrl(`/api/share/image/${imageId}`), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return res;
}

export async function deleteShareApi(shareId: string, token: string) {
  const res = await fetch(getApiUrl(`/api/share/${shareId}`), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return res;
}

export async function createShareApi(shareDocData: any, token: string) {
  const res = await fetch(getApiUrl('/api/share/create'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(shareDocData)
  });
  return res;
}
