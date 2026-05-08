import { describe, it, expect, beforeEach } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
// Node's native Blob round-trips through structuredClone; jsdom's polyfill
// does not, so override the global before fake-indexeddb is loaded.
globalThis.Blob = NodeBlob as unknown as typeof Blob;
import 'fake-indexeddb/auto';
import {
  putPendingAudio,
  getPendingAudio,
  clearPendingAudio,
  listPendingAudioIds,
} from '@/lib/indexed-db';

beforeEach(() => {
  // fake-indexeddb is reset between test files but not test cases
});

describe('indexed-db pending audio store', () => {
  it('stores and retrieves a blob by id', async () => {
    const blob = new Blob(['hello'], { type: 'audio/webm' });
    await putPendingAudio('story-1', blob);
    const retrieved = await getPendingAudio('story-1');
    expect(retrieved).toBeInstanceOf(Blob);
    expect(await retrieved!.text()).toBe('hello');
  });

  it('returns null for unknown ids', async () => {
    expect(await getPendingAudio('unknown')).toBeNull();
  });

  it('clears stored blobs', async () => {
    await putPendingAudio('story-2', new Blob(['x']));
    await clearPendingAudio('story-2');
    expect(await getPendingAudio('story-2')).toBeNull();
  });

  it('lists pending ids', async () => {
    await putPendingAudio('story-A', new Blob(['a']));
    await putPendingAudio('story-B', new Blob(['b']));
    const ids = await listPendingAudioIds();
    expect(ids).toEqual(expect.arrayContaining(['story-A', 'story-B']));
  });
});
