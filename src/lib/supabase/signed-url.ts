import { getServiceSupabase } from './server';

export async function getAudioSignedUrl(path: string, expiresIn = 60 * 60) {
  const sb = getServiceSupabase();
  const { data, error } = await sb.storage.from('audio').createSignedUrl(path, expiresIn);
  if (error || !data) throw new Error(error?.message ?? 'signed url failed');
  return data.signedUrl;
}
