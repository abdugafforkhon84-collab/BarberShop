/**
 * api/client.js
 * ------------------------------------------------------------
 * Central axios instance: attaches the JWT access token to
 * every request, and redirects to /login on 401 responses.
 * ------------------------------------------------------------
 */
import axios from 'axios';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem('barberpro_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('barberpro_token');
            localStorage.removeItem('barberpro_role');
            localStorage.removeItem('barberpro_name');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default client;
