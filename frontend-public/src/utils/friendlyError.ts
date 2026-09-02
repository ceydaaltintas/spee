type Translations = Record<string, string>;

export function friendlyError(e: any, t: (key: string) => string): string {
  const status = e?.response?.status;
  const serverMsg = e?.response?.data?.error;

  if (serverMsg) return serverMsg;

  const isNetworkError =
    !e?.response &&
    (e?.message === 'Network Error' || e?.code === 'ERR_NETWORK' || e?.code === 'ECONNREFUSED');

  if (isNetworkError) return t('error_network');
  if (status === 429) return t('error_rate_limit');
  if (status === 500 || status === 502 || status === 503 || status === 504) return t('error_ai_down');
  if (status === 408 || e?.code === 'ECONNABORTED') return t('error_timeout');

  return e?.message || t('error_unknown');
}
