import axios from 'axios';

let rawBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
if (rawBaseUrl.endsWith('/')) {
  rawBaseUrl = rawBaseUrl.slice(0, -1);
}
const baseURL = (rawBaseUrl.startsWith('http') && !rawBaseUrl.endsWith('/api'))
  ? `${rawBaseUrl}/api`
  : rawBaseUrl;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('csh_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('csh_token');
      localStorage.removeItem('csh_user');
    }
    return Promise.reject(error);
  }
);

export default api;
