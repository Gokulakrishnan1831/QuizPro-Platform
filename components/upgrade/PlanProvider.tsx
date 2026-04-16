'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import type { PlanId } from '@/lib/plans';

interface PlanContextValue {
  currentTier: PlanId;
  quizzesRemaining: number;
  isLoading: boolean;
  /** Opens the global upgrade dialog, optionally naming the locked feature attempted */
  openUpgradeDialog: (lockedFeature?: string) => void;
  closeUpgradeDialog: () => void;
  upgradeDialogOpen: boolean;
  upgradeDialogFeature: string;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextValue>({
  currentTier: 'FREE',
  quizzesRemaining: 1,
  isLoading: true,
  openUpgradeDialog: () => {},
  closeUpgradeDialog: () => {},
  upgradeDialogOpen: false,
  upgradeDialogFeature: '',
  refreshPlan: async () => {},
});

export function usePlan() {
  return useContext(PlanContext);
}

const REMIND_KEY = 'preplytics_upgrade_remind_until';

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [currentTier, setCurrentTier] = useState<PlanId>('FREE');
  const [quizzesRemaining, setQuizzesRemaining] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradeDialogFeature, setUpgradeDialogFeature] = useState('');

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) return;
      const data = await res.json();
      setCurrentTier((data.profile?.subscriptionTier ?? 'FREE') as PlanId);
      setQuizzesRemaining(data.profile?.quizzesRemaining ?? 0);
    } catch {
      // user not logged in, keep FREE
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchPlan();
      } else {
        setCurrentTier('FREE');
        setQuizzesRemaining(1);
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, [fetchPlan]);

  const openUpgradeDialog = useCallback((lockedFeature = '') => {
    // Check sessionStorage suppression
    const remindUntil = sessionStorage.getItem(REMIND_KEY);
    if (remindUntil && Date.now() < Number(remindUntil)) {
      return; // suppressed
    }
    setUpgradeDialogFeature(lockedFeature);
    setUpgradeDialogOpen(true);
  }, []);

  const closeUpgradeDialog = useCallback(() => {
    setUpgradeDialogOpen(false);
    setUpgradeDialogFeature('');
  }, []);

  return (
    <PlanContext.Provider
      value={{
        currentTier,
        quizzesRemaining,
        isLoading,
        openUpgradeDialog,
        closeUpgradeDialog,
        upgradeDialogOpen,
        upgradeDialogFeature,
        refreshPlan: fetchPlan,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}
