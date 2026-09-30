export interface Env {
  DB: D1Database;
  ROOM: DurableObjectNamespace;
  LOBBY: DurableObjectNamespace;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET?: string;
  WEB_ORIGIN: string;
  API_ORIGIN: string;
  DEV_LOGIN?: string;
}

/** Thông tin người dùng đã xác thực, chuyển từ Worker sang Durable Object qua header */
export interface AuthUser {
  id: string;
  name: string;
  isGuest: boolean;
  avatar: string | null;
}

export const USER_HEADER = 'X-NP-User';

export function encodeUserHeader(u: AuthUser): string {
  return encodeURIComponent(JSON.stringify(u));
}

export function decodeUserHeader(v: string | null): AuthUser | null {
  if (!v) return null;
  try {
    return JSON.parse(decodeURIComponent(v)) as AuthUser;
  } catch {
    return null;
  }
}
