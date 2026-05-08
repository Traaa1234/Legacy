import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecorder } from '@/components/recorder/use-recorder';

class FakeMediaRecorder {
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['fake'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

beforeEach(() => {
  // @ts-expect-error mock global
  globalThis.MediaRecorder = FakeMediaRecorder;
  // @ts-expect-error mock global
  globalThis.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  };
});

describe('useRecorder', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useRecorder());
    expect(result.current.state).toBe('idle');
    expect(result.current.blob).toBeNull();
  });

  it('transitions idle → recording → reviewing on start/stop', async () => {
    const { result } = renderHook(() => useRecorder());

    await act(async () => { await result.current.start(); });
    expect(result.current.state).toBe('recording');

    await act(async () => { await result.current.stop(); });
    expect(result.current.state).toBe('reviewing');
    expect(result.current.blob).toBeInstanceOf(Blob);
  });

  it('reset returns to idle and clears blob', async () => {
    const { result } = renderHook(() => useRecorder());
    await act(async () => { await result.current.start(); });
    await act(async () => { await result.current.stop(); });
    act(() => { result.current.reset(); });
    expect(result.current.state).toBe('idle');
    expect(result.current.blob).toBeNull();
  });
});
