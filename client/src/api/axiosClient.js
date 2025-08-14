import axios from 'axios';
import { getGlobalCsrfToken, setGlobalCsrfToken } from '../lib/csrfStore';

const baseURL = ""; // same-origin (Vite proxy in dev, single origin in prod)

const axiosClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

let csrfPromise = null;

async function ensureCsrfToken() {
  const existing = getGlobalCsrfToken();
  if (existing) return existing;

  if (!csrfPromise) {
    csrfPromise = axiosClient
      .get('/api/get-csrf-token') // ✅ use axiosClient + relative path
      .then((res) => {
        setGlobalCsrfToken(res.data?.csrfToken || '');
        return res.data?.csrfToken || '';
      })
      .finally(() => { csrfPromise = null; });
  }
  return csrfPromise;
}

axiosClient.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const isUnsafe = ['post', 'put', 'patch', 'delete'].includes(method);

  const url = config.url || '';
  const path = url.startsWith('http') ? new URL(url).pathname : url;

  // Don't require CSRF for auth endpoints or the token fetch itself
  const skip = path.startsWith('/auth/') || path === '/api/get-csrf-token';

  if (isUnsafe && !skip) {
    let token = getGlobalCsrfToken();
    if (!token) token = await ensureCsrfToken();
    (config.headers ||= {})['X-CSRF-Token'] = token; // ✅ guard headers
  }
  return config;
});

export { ensureCsrfToken };
export default axiosClient;