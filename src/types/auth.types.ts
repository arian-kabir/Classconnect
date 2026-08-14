// src/types/auth.types.ts

export type UserRole = 'STUDENT' | 'LECTURER' | 'STUDENT_TUTOR' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  googleId?: string;
  profilePictureUrl?: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSession {
  id: number;
  userId: number;
  sessionToken: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
}

export interface DashboardPermissions {
  canManageUsers: boolean;
  canManageCourses: boolean;
  canManageSystem: boolean;
  canCreateCourses: boolean;
  canManageCourseMaterials: boolean;
  canCreateAssignments: boolean;
  canGradeSubmissions: boolean;
  canAssistStudents: boolean;
  canViewCourses: boolean;
  canSubmitAssignments: boolean;
  canAccessMaterials: boolean;
}

export interface AuthUser extends User {
  permissions: DashboardPermissions;
}

export interface SessionData {
  user: AuthUser;
  sessionToken: string;
  expiresAt: Date;
}