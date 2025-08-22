// CsrfProvider.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { ensureCsrfToken } from '../api/axiosClient';
import { getGlobalCsrfToken, setGlobalCsrfToken } from '../lib/csrfStore';

const CsrfContext = createContext({ csrfToken: null, loading: true });

export const CsrfProvider = ({ children }) => {
  const [csrfToken, setCsrfToken] = useState(getGlobalCsrfToken() || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await ensureCsrfToken(); // always refresh on mount
        setGlobalCsrfToken(token);
        setCsrfToken(token);
      } catch (err) {
        console.error('Failed to fetch CSRF token:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []); // <-- run once

  return (
    <CsrfContext.Provider value={{ csrfToken, loading }}>
      {children}
    </CsrfContext.Provider>
  );
};

export const useCsrf = () => useContext(CsrfContext);
