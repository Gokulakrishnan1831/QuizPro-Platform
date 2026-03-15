import { act, renderHook } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useProctoring } from '@/hooks/useProctoring';

const mocks = vi.hoisted(() => {
  const assessMock = vi.fn();
  const e2eStateMock = vi.fn(() => null);
  const e2eAssessmentMock = vi.fn(() => null);
  const isE2EEnabledMock = vi.fn(() => false);
  const getFaceMonitorMock = vi.fn(async () => ({
    assess: assessMock,
  }));

  return {
    assessMock,
    e2eStateMock,
    e2eAssessmentMock,
    isE2EEnabledMock,
    getFaceMonitorMock,
  };
});

vi.mock('@/lib/proctoring/faceMonitor', () => ({
  getFaceMonitor: mocks.getFaceMonitorMock,
}));

vi.mock('@/lib/proctoring/e2eControl', () => ({
  getE2EProctoringState: mocks.e2eStateMock,
  getE2EAssessment: mocks.e2eAssessmentMock,
  isE2EProctoringEnabled: mocks.isE2EEnabledMock,
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
  const step = 250;
  let remaining = ms;
  while (remaining > 0) {
    const chunk = Math.min(step, remaining);
    await act(async () => {
      vi.advanceTimersByTime(chunk);
      await Promise.resolve();
      await Promise.resolve();
    });
    remaining -= chunk;
  }
}

describe('useProctoring face violation sequencing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.assessMock.mockReset();
    mocks.getFaceMonitorMock.mockClear();
    mocks.e2eStateMock.mockReset();
    mocks.e2eAssessmentMock.mockReset();
    mocks.isE2EEnabledMock.mockReset();
    mocks.e2eStateMock.mockReturnValue(null);
    mocks.e2eAssessmentMock.mockReturnValue(null);
    mocks.isE2EEnabledMock.mockReturnValue(false);
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

    mocks.assessMock.mockResolvedValue({
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

    await advance(6500);

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

    mocks.assessMock
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

    await advance(6500);
    expect(result.current.violationCount).toBe(1);
    expect(result.current.terminated).toBe(false);

    track.muted = true;
    await advance(7000);

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

  it('terminates when face-away recurs after stable recovery', async () => {
    const onTerminate = vi.fn();
    const { stream } = makeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => stream),
      },
    });

    let assessCalls = 0;
    mocks.assessMock.mockImplementation(async () => {
      assessCalls += 1;
      if (assessCalls <= 9) {
        return {
          status: 'face_away',
          yaw: 24,
          pitch: 2,
          roll: 0,
          confidence: 0.88,
        };
      }
      if (assessCalls <= 13) {
        return {
          status: 'ok',
          yaw: 0,
          pitch: 0,
          roll: 0,
          confidence: 0.95,
        };
      }
      return {
        status: 'face_away',
        yaw: 24,
        pitch: 2,
        roll: 0,
        confidence: 0.88,
      };
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

    await advance(6500);
    expect(result.current.violationCount).toBe(1);
    expect(result.current.terminated).toBe(false);

    await advance(14000);
    expect(result.current.violationCount).toBeGreaterThanOrEqual(2);
    expect(result.current.terminated).toBe(true);
    expect(result.current.terminatedReason).toBe('face_away');

    await advance(1600);
    expect(onTerminate).toHaveBeenCalledTimes(1);
  });

  it('does not invoke delayed terminate callback after cleanup', async () => {
    const onTerminate = vi.fn();
    const { stream, track } = makeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => stream),
      },
    });

    mocks.assessMock.mockResolvedValue({
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
      await result.current.startFaceMonitoring(makeVideoEl());
    });

    await advance(6500);
    expect(result.current.violationCount).toBe(1);
    track.muted = true;
    await advance(7000);
    expect(result.current.terminated).toBe(true);

    act(() => {
      result.current.cleanup();
    });

    const callsBefore = onTerminate.mock.calls.length;
    await advance(2000);
    expect(onTerminate.mock.calls.length).toBe(callsBefore);
  });

  it('shows remaining tab-switch attempts when threshold is above 2', async () => {
    const onTerminate = vi.fn();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => makeStream().stream),
      },
    });

    const { result } = renderHook(() =>
      useProctoring({ enabled: true, maxTabSwitches: 3, onTerminate }),
    );

    await act(async () => {
      result.current.markReady();
    });

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await advance(250);

    expect(result.current.tabSwitchCount).toBe(1);
    expect(result.current.warningMessage).toContain('2 more');
    expect(result.current.terminated).toBe(false);
  });

  it('warns on first fullscreen exit and terminates on second', async () => {
    const onTerminate = vi.fn();
    let fullscreenElement: Element | null = document.documentElement;
    const requestFullscreen = vi.fn(async () => {
      fullscreenElement = document.documentElement;
    });

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    const { result } = renderHook(() =>
      useProctoring({ enabled: true, maxTabSwitches: 2, onTerminate }),
    );

    act(() => {
      result.current.markReady();
    });

    act(() => {
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(result.current.violationCount).toBe(1);
    expect(result.current.showWarning).toBe(true);
    expect(result.current.warningMessage).toContain('Fullscreen mode was exited');
    expect(result.current.terminated).toBe(false);

    await advance(200);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);

    act(() => {
      fullscreenElement = document.documentElement;
    });
    act(() => {
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(result.current.violationCount).toBe(2);
    expect(result.current.terminated).toBe(true);
    expect(result.current.terminatedReason).toBe('fullscreen_exit');

    await advance(1600);
    expect(onTerminate).toHaveBeenCalledTimes(1);
  });

  it('blocks restricted clipboard and shortcut actions while proctoring is active', async () => {
    const onTerminate = vi.fn();

    const { result } = renderHook(() =>
      useProctoring({ enabled: true, maxTabSwitches: 2, onTerminate }),
    );

    act(() => {
      result.current.markReady();
    });

    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
    document.dispatchEvent(copyEvent);
    expect(copyEvent.defaultPrevented).toBe(true);

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    document.dispatchEvent(pasteEvent);
    expect(pasteEvent.defaultPrevented).toBe(true);

    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    document.dispatchEvent(contextMenuEvent);
    expect(contextMenuEvent.defaultPrevented).toBe(true);

    const shortcutEvent = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(shortcutEvent);
    expect(shortcutEvent.defaultPrevented).toBe(true);
  });

  it('does not raise violation for short no-face flicker that recovers quickly', async () => {
    const onTerminate = vi.fn();
    const { stream } = makeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => stream),
      },
    });

    mocks.assessMock
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
        status: 'ok',
        yaw: 0,
        pitch: 0,
        roll: 0,
        confidence: 0.92,
      });

    const { result } = renderHook(() =>
      useProctoring({ enabled: true, maxTabSwitches: 2, onTerminate }),
    );

    await act(async () => {
      await result.current.requestCamera();
      result.current.markReady();
      await result.current.startFaceMonitoring(makeVideoEl());
    });

    await advance(2600);

    expect(result.current.violationCount).toBe(0);
    expect(result.current.showWarning).toBe(false);
    expect(result.current.terminated).toBe(false);
    expect(onTerminate).not.toHaveBeenCalled();
  });

  it('ignores face violations during the startup stabilization window', async () => {
    const onTerminate = vi.fn();
    const { stream } = makeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => stream),
      },
    });

    mocks.assessMock.mockResolvedValue({
      status: 'no_face',
      yaw: null,
      pitch: null,
      roll: null,
      confidence: null,
    });

    const { result } = renderHook(() =>
      useProctoring({
        enabled: true,
        maxTabSwitches: 2,
        onTerminate,
        monitorIntervalMs: 500,
        faceViolationGraceMs: 1000,
        minConsecutiveSamples: 2,
        violationCooldownMs: 1000,
        startupFaceGraceMs: 2500,
      }),
    );

    await act(async () => {
      await result.current.requestCamera();
      result.current.markReady();
      await result.current.startFaceMonitoring(makeVideoEl());
    });

    await advance(2000);
    expect(result.current.violationCount).toBe(0);
    expect(result.current.showWarning).toBe(false);

    await advance(2000);
    expect(result.current.violationCount).toBe(1);
    expect(result.current.warningMessage).toContain('face is not visible');
  });

  it('suppresses face violations while typing in a text field', async () => {
    const onTerminate = vi.fn();
    const { stream } = makeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => stream),
      },
    });

    mocks.assessMock.mockResolvedValue({
      status: 'face_away',
      yaw: 25,
      pitch: 6,
      roll: 0,
      confidence: 0.9,
    });

    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);

    const { result } = renderHook(() =>
      useProctoring({
        enabled: true,
        maxTabSwitches: 2,
        onTerminate,
        monitorIntervalMs: 500,
        faceViolationGraceMs: 1000,
        minConsecutiveSamples: 2,
        violationCooldownMs: 1000,
        startupFaceGraceMs: 0,
        textEntryGraceMs: 1500,
      }),
    );

    await act(async () => {
      await result.current.requestCamera();
      result.current.markReady();
      input.focus();
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await result.current.startFaceMonitoring(makeVideoEl());
    });

    await advance(2000);
    expect(result.current.violationCount).toBe(0);
    expect(result.current.showWarning).toBe(false);

    await act(async () => {
      input.blur();
    });
    await advance(3000);
    expect(result.current.violationCount).toBe(1);

    input.remove();
  });

  it('does not count fullscreen exit as a violation while typing', async () => {
    const onTerminate = vi.fn();
    const requestFullscreen = vi.fn(async () => {
      fullscreenElement = document.documentElement;
    });
    let fullscreenElement: Element | null = document.documentElement;

    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });

    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);

    const { result } = renderHook(() =>
      useProctoring({
        enabled: true,
        maxTabSwitches: 2,
        onTerminate,
        textEntryGraceMs: 1000,
      }),
    );

    act(() => {
      result.current.markReady();
      input.focus();
      input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });

    act(() => {
      fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    expect(result.current.violationCount).toBe(0);
    expect(result.current.showWarning).toBe(false);

    await advance(1100);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);

    input.remove();
  });

  it('uses synthetic E2E face assessment without initializing the real face monitor', async () => {
    const onTerminate = vi.fn();
    mocks.isE2EEnabledMock.mockReturnValue(true);
    mocks.e2eAssessmentMock.mockReturnValue({
      status: 'ok',
      yaw: 0,
      pitch: 0,
      roll: 0,
      confidence: 0.98,
    });

    const { result } = renderHook(() =>
      useProctoring({
        enabled: false,
        maxTabSwitches: 2,
        onTerminate,
        startFaceCheckTimeoutMs: 1000,
        startFaceCheckStableMs: 0,
        startFaceCheckPollMs: 50,
      }),
    );

    let verified = false;
    await act(async () => {
      verified = await result.current.runStartFaceCheck(makeVideoEl());
    });

    expect(verified).toBe(true);
    expect(result.current.cameraError).toBeNull();
    expect(result.current.faceStatus).toBe('ok');
    expect(mocks.getFaceMonitorMock).not.toHaveBeenCalled();
  });

  it('re-arms face violations after configured stable recovery window', async () => {
    const onTerminate = vi.fn();
    const { stream } = makeStream();
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn(async () => stream),
      },
    });

    let assessCalls = 0;
    mocks.assessMock.mockImplementation(async () => {
      assessCalls += 1;
      if (assessCalls <= 3) {
        return {
          status: 'no_face',
          yaw: null,
          pitch: null,
          roll: null,
          confidence: null,
        };
      }
      if (assessCalls <= 6) {
        return {
          status: 'ok',
          yaw: 0,
          pitch: 0,
          roll: 0,
          confidence: 0.98,
        };
      }
      return {
        status: 'face_away',
        yaw: 28,
        pitch: 6,
        roll: 0,
        confidence: 0.9,
      };
    });

    const { result } = renderHook(() =>
      useProctoring({
        enabled: true,
        maxTabSwitches: 2,
        onTerminate,
        monitorIntervalMs: 500,
        faceViolationGraceMs: 1000,
        minConsecutiveSamples: 2,
        violationCooldownMs: 1000,
        faceRecoveryStableMs: 1000,
        startupFaceGraceMs: 0,
      }),
    );

    await act(async () => {
      await result.current.requestCamera();
      result.current.markReady();
      await result.current.startFaceMonitoring(makeVideoEl());
    });

    await advance(2200);
    expect(result.current.violationCount).toBe(1);
    expect(result.current.terminated).toBe(false);

    await advance(2600);
    expect(result.current.violationCount).toBe(2);
    expect(result.current.terminated).toBe(true);
    expect(result.current.terminatedReason).toBe('face_away');
  });
});
