'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'reviewing';

export interface UseRecorderResult {
  state: RecorderState;
  blob: Blob | null;
  durationSeconds: number;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  reset: () => void;
}

export function useRecorder(): UseRecorderResult {
  const [state, setState] = useState<RecorderState>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopResolverRef = useRef<((blob: Blob | null) => void) | null>(null);

  const start = useCallback(async () => {
    chunksRef.current = [];
    setBlob(null);
    setDurationSeconds(0);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const finalBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setBlob(finalBlob);
      setState('reviewing');
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      // Resolve the in-flight stop() promise
      const resolver = stopResolverRef.current;
      stopResolverRef.current = null;
      resolver?.(finalBlob);
    };

    rec.start();
    recorderRef.current = rec;
    startedAtRef.current = Date.now();
    setState('recording');

    tickRef.current = setInterval(() => {
      if (startedAtRef.current) {
        setDurationSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 250);
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        resolve(null);
        return;
      }
      stopResolverRef.current = resolve;
      rec.stop();
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    });
  }, []);

  const reset = useCallback(() => {
    setBlob(null);
    setState('idle');
    setDurationSeconds(0);
  }, []);

  useEffect(
    () => () => {
      if (tickRef.current) clearInterval(tickRef.current);
    },
    [],
  );

  return { state, blob, durationSeconds, start, stop, reset };
}
