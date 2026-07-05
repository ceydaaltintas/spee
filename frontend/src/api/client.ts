import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('spee_api_key') || import.meta.env.VITE_API_KEY || 'dev-api-key';
  config.headers.Authorization = `Bearer ${apiKey}`;
  return config;
});

export default api;
