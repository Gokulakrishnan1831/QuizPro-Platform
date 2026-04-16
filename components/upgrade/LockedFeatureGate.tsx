'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import type { PlanId } from '@/lib/plans';
import { isFeatureLocked, PLANS } from '@/lib/plans';
import { usePlan } from './PlanProvider';

interface LockedFeatureGateProps {
  /** Minimum tier required to access this feature */
  requiredTier: PlanId;
  /** Human-readable feature name shown in the upgrade dialog */
  featureName: string;
  children: React.ReactNode;
  /**
   * 'overlay'  — renders children with a lock overlay on top (for cards/sections)
   * 'badge'    — renders children with a small "PRO" badge next to them
   * 'disabled' — replaces the children with a disabled-looking version + lock icon (for buttons)
   */
  variant?: 'overlay' | 'badge' | 'disabled';
  /** Optional extra styles for the wrapper */
  style?: React.CSSProperties;
  className?: string;
}

export function LockedFeatureGate({
  requiredTier,
  featureName,
  children,
  variant = 'badge',
  style,
  className,
}: LockedFeatureGateProps) {
  const { currentTier, openUpgradeDialog } = usePlan();
  const locked = isFeatureLocked(currentTier, requiredTier);

  if (!locked) {
    return <>{children}</>;
  }

  const plan = PLANS.find((p) => p.id === requiredTier);
  const planColor = plan?.color ?? '#6366f1';
  const planName = plan?.name ?? requiredTier;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openUpgradeDialog(featureName);
  };

  if (variant === 'overlay') {
    return (
      <div
        style={{ position: 'relative', ...style }}
        className={className}
      >
        {/* Blurred children */}
        <div style={{ filter: 'blur(3px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
          {children}
        </div>
        {/* Lock overlay */}
        <div
          onClick={handleClick}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            gap: '10px',
            background: 'rgba(5, 5, 20, 0.5)',
            backdropFilter: 'blur(2px)',
            borderRadius: 'inherit',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: `${planColor}20`,
              border: `2px solid ${planColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={22} color={planColor} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
              {featureName}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                background: `${planColor}20`,
                border: `1px solid ${planColor}40`,
                borderRadius: '10px',
                fontSize: '0.72rem',
                color: planColor,
                fontWeight: '700',
              }}
            >
              {plan?.icon} {planName}+
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Click to upgrade
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'disabled') {
    // Wrap children so clicking them triggers dialog
    return (
      <div
        onClick={handleClick}
        style={{ position: 'relative', cursor: 'pointer', ...style }}
        className={className}
        title={`Requires ${planName} plan — click to upgrade`}
      >
        <div style={{ opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }}>
          {children}
        </div>
        {/* Badge overlay bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            background: `${planColor}20`,
            border: `1px solid ${planColor}`,
            borderRadius: '8px',
            fontSize: '0.68rem',
            color: planColor,
            fontWeight: '800',
            pointerEvents: 'none',
          }}
        >
          <Lock size={10} /> {planName}
        </div>
      </div>
    );
  }

  // variant === 'badge' (default)
  return (
    <div
      onClick={handleClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', ...style }}
      className={className}
      title={`Requires ${planName} plan — click to upgrade`}
    >
      <div style={{ opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '2px 8px',
          background: `${planColor}20`,
          border: `1px solid ${planColor}`,
          borderRadius: '8px',
          fontSize: '0.68rem',
          color: planColor,
          fontWeight: '800',
          flexShrink: 0,
          pointerEvents: 'none',
        }}
      >
        <Lock size={10} /> {planName}
      </span>
    </div>
  );
}
