// src/lib/auth/role-mapper.ts

export class RoleMapper {
  static getPermissionsForRole(role: string): string[] {
    const permissions: Record<string, string[]> = {
      admin: ['manage_users', 'manage_courses', 'manage_sections', 'view_all_data'],
      teacher: ['manage_sections', 'create_content', 'grade_assignments', 'view_students'],
      student: ['view_courses', 'submit_assignments', 'take_quizzes', 'view_grades'],
    };

    return permissions[role] || [];
  }

  static hasPermission(role: string, permission: string): boolean {
    const permissions = this.getPermissionsForRole(role);
    return permissions.includes(permission);
  }
}
