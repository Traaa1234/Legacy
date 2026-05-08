'use client';

import { useState } from 'react';
import { BigButton } from '@/components/senior-ui';
import { PhotoUploadModal } from '@/components/photos/PhotoUploadModal';
import { DownloadButton } from './download-button';

interface StoryOption {
  id: string;
  question_text: string | null;
  chapter: string;
}

interface Props {
  uploadedByUserId: string;
  forSeniorUserId: string;
  stories: StoryOption[];
}

export function MemoirActions({
  uploadedByUserId,
  forSeniorUserId,
  stories,
}: Props) {
  const [uploadOpen, setUploadOpen] = useState(false);
  return (
    <>
      <div className="flex gap-3 my-6 max-w-2xl mx-auto px-4">
        <BigButton variant="secondary" onClick={() => setUploadOpen(true)}>
          📷 Add a photo
        </BigButton>
        <DownloadButton seniorUserId={forSeniorUserId} />
      </div>
      {uploadOpen && (
        <PhotoUploadModal
          uploadedByUserId={uploadedByUserId}
          forSeniorUserId={forSeniorUserId}
          stories={stories}
          onClose={() => setUploadOpen(false)}
          onSaved={() => window.location.reload()}
        />
      )}
    </>
  );
}
