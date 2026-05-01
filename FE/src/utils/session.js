export function parseTableLink(value) {
  const raw = String(value || '').trim();
  if (!raw) return { accessCode: '', tableId: '', token: '' };

  try {
    const url = new URL(raw, window.location.origin);
    const params = new URLSearchParams(url.search);
    return {
      accessCode: params.get('accessCode') || '',
      tableId: params.get('tableId') || '',
      token: params.get('token') || '',
    };
  } catch {
    const params = new URLSearchParams(raw.startsWith('?') ? raw : `?${raw}`);
    return {
      accessCode: params.get('accessCode') || '',
      tableId: params.get('tableId') || '',
      token: params.get('token') || '',
    };
  }
}
