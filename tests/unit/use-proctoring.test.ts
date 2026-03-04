import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useProctoring } from '@/hooks/useProctoring';

const assessMock = vi.fn();

vi.mock('@/lib/proctoring/faceMonitor', () => ({
  getFaceMonitor: vi.fn(async () => ({
    assess: assessMock,
  })),
}));

function makeVideoEl() {
  const video = document.createElement('video');
  Object.defineProperty(video, 'readyState', {
    value: HTMLMediaElement.HAVE_CURRENT_DATA,
    configurable: true,
  });
  return video;
}

function makeStream() {
  const track = {
    readyState: 'live' as const,
    muted: false,
    stop: vi.fn(),
  };
  return {
    stream: {
      getVideoTracks: () => [track],
      getTracks: () => [track],
    } as unknown as MediaStream,
    track,
  };
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useProctoring face violation sequencing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    assessMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('warns on first sustained no-face violation', async () => {
    const onTerminate = vi.fn();
    const { stream } = makeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => stream),
      },
    });

    assessMock.mockResolvedValue({
      status: 'no_face',
      yaw: null,
      pitch: null,
      roll: null,
      confidence: null,
    });

    const { result } = renderHook(() =>
      useProctoring({ enabled: true, maxTabSwitches: 2, onTerminate }),
    );

    await act(async () => {
      await result.current.requestCamera();
      result.current.markReady();
    });

    const videoEl = makeVideoEl();
    await act(async () => {
      await result.current.startFaceMonitoring(videoEl);
    });

    await advance(2100);

    expect(result.current.violationCount).toBe(1);
    expect(result.current.showWarning).toBe(true);
    expect(result.current.terminated).toBe(false);
    expect(result.current.warningMessage).toContain('face is not visible');
    expect(onTerminate).not.toHaveBeenCalled();
  });

  it('terminates on second sustained violation after recovery', async () => {
    const onTerminate = vi.fn();
    const { stream, track } = makeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => stream),
      },
    });

    assessMock
      .mockResolvedValueOnce({
        status: 'no_face',
        yaw: null,
        pitch: null,
        roll: null,
        confidence: null,
      })
      .mockResolvedValueOnce({
        status: 'no_face',
        yaw: null,
        pitch: null,
        roll: null,
        confidence: null,
      })
      .mockResolvedValueOnce({
        status: 'no_face',
        yaw: null,
        pitch: null,
        roll: null,
        confidence: null,
      })
      .mockResolvedValue({
        status: 'no_face',
        yaw: null,
        pitch: null,
        roll: null,
        confidence: null,
      });

    const { result } = renderHook(() =>
      useProctoring({ enabled: true, maxTabSwitches: 2, onTerminate }),
    );

    await act(async () => {
      await result.current.requestCamera();
      result.current.markReady();
    });

    const videoEl = makeVideoEl();
    await act(async () => {
      await result.current.startFaceMonitoring(videoEl);
    });

    await advance(2100);
    expect(result.current.violationCount).toBe(1);
    expect(result.current.terminated).toBe(false);

    track.muted = true;
    await advance(2200);

    expect(result.current.violationCount).toBe(2);
    expect(result.current.terminated).toBe(true);
    expect(result.current.terminatedReason).toBe('camera_off');
    expect(result.current.violationEvents.some((e) => e.type === 'no_face')).toBe(
      true,
    );
    expect(
      result.current.violationEvents.some((e) => e.type === 'camera_off'),
    ).toBe(true);

    await advance(1600);
    expect(onTerminate).toHaveBeenCalledTimes(1);
  });
});
