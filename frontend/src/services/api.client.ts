/**
 * Real API client for Go backend
 * Base URL: http://localhost:8080
 */

import { AuthService } from './auth.service';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export class ApiError extends Error {
  code: string;
  details?: any;
  status?: number;

  constructor(message: string, code: string = 'INTERNAL_ERROR', status?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      errorText || response.statusText,
      'API_ERROR',
      response.status
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Get headers including Authorization token if available
 */
interface RequestOptions {
  headers?: HeadersInit;
}

function getHeaders(customHeaders?: HeadersInit): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header if token exists
  const token = AuthService.getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (customHeaders) {
    return { ...headers, ...customHeaders };
  }
  return headers;
}

export const apiClient = {
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(options.headers),
    });
    return handleResponse<T>(response);
  },

  async post<T>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(options.headers),
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async put<T>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(options.headers),
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(options.headers),
    });
    return handleResponse<T>(response);
  },
};
