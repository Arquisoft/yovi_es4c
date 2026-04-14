/**
 * Helper centralizado para peticiones autenticadas.
 * Lee el JWT de localStorage y lo añade automáticamente en cada request.
 */
export const API_URL    = import.meta.env.VITE_API_URL    ?? 'http://localhost:8080';
export const GAMEY_URL  = import.meta.env.VITE_GAMEY_URL  ?? 'http://localhost:8080';

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}