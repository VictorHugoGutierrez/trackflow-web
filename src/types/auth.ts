export type UserRole = "SUPER_ADMIN" | "OWNER" | "MANAGER" | "MEMBER";

export interface JWTPayload {
  sub: string;
  tenantId: string | null;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
}

export interface Tenant {
  id: string;
  name: string;
  plan: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
