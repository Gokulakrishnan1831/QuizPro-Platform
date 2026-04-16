'use client';

import { usePlan } from './PlanProvider';
import { UpgradeDialog } from './UpgradeDialog';

/**
 * Renders the global UpgradeDialog driven by PlanProvider state.
 * Placed once in layout.tsx so the dialog is available on every page.
 */
export function GlobalUpgradeDialog() {
  const { upgradeDialogOpen, closeUpgradeDialog, currentTier, upgradeDialogFeature } = usePlan();

  return (
    <UpgradeDialog
      isOpen={upgradeDialogOpen}
      onClose={closeUpgradeDialog}
      currentTier={currentTier}
      lockedFeature={upgradeDialogFeature}
    />
  );
}
