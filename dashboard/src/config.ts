const trim = (url: string) => url.replace(/\/+$/, '');

export const API_URL = trim(import.meta.env.VITE_API_URL || 'http://localhost:5656/api/v1');
export const SOCKET_URL = trim(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5656');
