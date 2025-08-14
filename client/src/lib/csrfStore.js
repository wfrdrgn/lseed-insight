let csrfTokenValue = null;

export const setGlobalCsrfToken = (token) => { csrfTokenValue = token; };
export const getGlobalCsrfToken = () => csrfTokenValue;