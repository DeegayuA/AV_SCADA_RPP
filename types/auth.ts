// src/types/auth.ts (New File or add to an existing shared types location)
export enum UserRole {
    ADMIN = 'admin',
    OPERATOR = 'operator',
    VIEWER = 'viewer',
  }
  
  export interface User {
    email: string;
    passwordHash?: string; // Note: Storing password hashes client-side is not typical for production.
    role: UserRole;
    avatar?: string;
    name:string;
    redirectPath: string;
  }