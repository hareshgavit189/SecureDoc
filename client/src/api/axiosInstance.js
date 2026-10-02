/**
 * axiosInstance.js
 * Configured Axios instance for SecureDoc DMS API calls.
 * - Base URL from VITE_API_URL env, or relative in production, or defaults to http://localhost:5000 in dev.
 * - withCredentials: true (sends httpOnly cookies for refresh token)
 */
import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.PROD ? '' : 'http://localhost:5000');

const axiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
