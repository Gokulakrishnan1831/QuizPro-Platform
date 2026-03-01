import { create } from 'zustand';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  persona: 'SWITCHER' | 'JOB_HOPPER' | 'FRESHER' | null;
  experienceYears: number | null;
  subscriptionTier: 'FREE' | 'BASIC' | 'PRO' | 'ELITE';
  quizzesRemaining: number;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () =>
    set({ user: null, isAuthenticated: false, isLoading: false }),
}));
