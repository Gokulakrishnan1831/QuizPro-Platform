import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProctoringGate } from '@/components/quiz/ProctoringOverlay';

vi.mock('framer-motion', () => {
  const React = require('react');

  const passthrough = React.forwardRef(
    (
      {
        children,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode },
      ref: React.ForwardedRef<HTMLDivElement>,
    ) => React.createElement('div', { ...props, ref }, children),
  );

  const button = React.forwardRef(
    (
      {
        children,
        whileHover: _whileHover,
        whileTap: _whileTap,
        initial: _initial,
        animate: _animate,
        exit: _exit,
        transition: _transition,
        ...props
      }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
        children?: React.ReactNode;
        whileHover?: unknown;
        whileTap?: unknown;
        initial?: unknown;
        animate?: unknown;
        exit?: unknown;
        transition?: unknown;
      },
      ref: React.ForwardedRef<HTMLButtonElement>,
    ) => React.createElement('button', { ...props, ref }, children),
  );

  return {
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    motion: {
      div: passthrough,
      button,
    },
  };
});

describe('ProctoringGate', () => {
  it('requests fullscreen before face verification on start click', async () => {
    const callOrder: string[] = [];
    const stream = {} as MediaStream;

    render(
      <ProctoringGate
        onReady={vi.fn()}
        requestCamera={vi.fn(async () => true)}
        requestFullscreen={vi.fn(async () => {
          callOrder.push('fullscreen');
          return true;
        })}
        runStartFaceCheck={vi.fn(async () => {
          callOrder.push('face');
          return true;
        })}
        cameraStream={stream}
        cameraError={null}
        faceStatus="ok"
      />,
    );

    fireEvent.click(screen.getByTestId('proctor-start-btn'));

    await waitFor(() => {
      expect(callOrder).toEqual(['fullscreen', 'face']);
    });
  });

  it('requests fullscreen before camera when camera is not granted yet', async () => {
    const callOrder: string[] = [];

    render(
      <ProctoringGate
        onReady={vi.fn()}
        requestCamera={vi.fn(async () => {
          callOrder.push('camera');
          return false;
        })}
        requestFullscreen={vi.fn(async () => {
          callOrder.push('fullscreen');
          return true;
        })}
        runStartFaceCheck={vi.fn(async () => {
          callOrder.push('face');
          return true;
        })}
        cameraStream={null}
        cameraError={null}
        faceStatus="ok"
      />,
    );

    fireEvent.click(screen.getByTestId('proctor-start-btn'));

    await waitFor(() => {
      expect(callOrder).toEqual(['fullscreen', 'camera']);
    });
  });

  it('blocks quiz start and shows an error when fullscreen is denied', async () => {
    const onReady = vi.fn();
    const stream = {} as MediaStream;

    render(
      <ProctoringGate
        onReady={onReady}
        requestCamera={vi.fn(async () => true)}
        requestFullscreen={vi.fn(async () => false)}
        runStartFaceCheck={vi.fn(async () => true)}
        cameraStream={stream}
        cameraError={null}
        faceStatus="ok"
      />,
    );

    fireEvent.click(screen.getByTestId('proctor-start-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('proctor-camera-error')).toHaveTextContent(
        'Fullscreen could not be enabled',
      );
    });
    expect(onReady).not.toHaveBeenCalled();
  });
});
