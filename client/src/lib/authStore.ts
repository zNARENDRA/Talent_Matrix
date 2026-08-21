import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'coordinator' | 'student' | 'reviewer' | 'recruiter';
  studentId?: string;
  department?: string;
  gpa?: number;
  status?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  role: AuthUser['role'] | null;
  isAuthenticated: boolean;
  login: (userData: AuthUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: {
        id: 'admin-default',
        name: 'Dr. Rajesh Kumar',
        email: 'admin@talentmatrix.edu',
        role: 'super_admin',
      },
      token: 'mock-initial-token',
      role: 'super_admin',
      isAuthenticated: true,

      login: (user, token) => {
        localStorage.setItem('tm_token', token);
        if (user.studentId) {
          localStorage.setItem('tm_student_id', user.studentId);
        } else {
          localStorage.removeItem('tm_student_id');
        }
        set({ user, token, role: user.role, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('tm_token');
        localStorage.removeItem('tm_student_id');
        set({ user: null, token: null, role: null, isAuthenticated: false });
      },
    }),
    {
      name: 'talentmatrix-auth-storage',
    }
  )
);
