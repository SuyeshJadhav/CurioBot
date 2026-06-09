import type { User } from '../types/curio';
import { API_BASE, getHeaders, handleResponse } from './apiClient';

export interface AuthResult {
  token: string;
  user: User;
}

export async function loginUser(username: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handleResponse<AuthResult>(res, 'Login failed');
}

export async function loginWithOAuthToken(accessToken: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/oauth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  });
  return handleResponse<AuthResult>(res, 'OAuth login failed');
}

export async function registerUser(email: string, username: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  return handleResponse<AuthResult>(res, 'Registration failed');
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse<User>(res, 'Failed to retrieve current user');
}
