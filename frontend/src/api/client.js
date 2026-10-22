/**
 * Centralized API Client for Healthcare Management Backend
 * Handles base URL configuration, Bearer token injection, JSON serialization,
 * 204 No Content handling, unified error parsing, and 401 session expiry.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api').replace(/\/+$/, '');

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const authStorage = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  setToken: (token) => {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  },
  getUser: () => {
    try {
      const stored = sessionStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    if (user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_KEY);
    }
  },
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },
};

/**
 * Custom API Error class wrapping backend error responses.
 */
export class ApiError extends Error {
  constructor(message, status, code = 'ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Generic request wrapper using native Fetch API.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = {
    Accept: 'application/json',
    ...options.headers,
  };

  // Add Authorization header if token exists in session
  const token = authStorage.getToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Format body as JSON if needed
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body,
    });
  } catch (networkError) {
    throw new ApiError(
      'Unable to connect to backend server. Make sure the backend is running at ' + API_BASE_URL,
      0,
      'NETWORK_ERROR'
    );
  }

  // Handle HTTP 204 No Content (standard for DELETE endpoints)
  if (response.status === 204) {
    return { success: true, data: null };
  }

  // Parse JSON response safely
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // If unauthorized, broadcast session expiry event
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    const errorMessage =
      data?.error?.message ||
      data?.message ||
      `Request failed with status ${response.status} (${response.statusText})`;

    const errorCode = data?.error?.code || data?.code || 'API_ERROR';
    const errorDetails = data?.error?.details || data?.details || null;

    throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
  }

  return data;
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
