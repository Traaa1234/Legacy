import { getPhotoSignedUrl } from '@/lib/photos-queries';
import type { PhotoRow } from '@/lib/photos';

interface Props {
  photo: PhotoRow;
}

export async function MemoirPhoto({ photo }: Props) {
  const url = await getPhotoSignedUrl(photo.storage_path);
  return (
    <figure className="my-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={photo.caption ?? 'Memoir photo'}
        className="w-full max-w-2xl mx-auto rounded-card border border-sand"
      />
      {photo.caption && (
        <figcaption className="text-center mt-2 italic text-sm opacity-70">
          {photo.caption}
        </figcaption>
      )}
    </figure>
  );
}
