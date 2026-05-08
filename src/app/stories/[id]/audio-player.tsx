'use client';

import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

export function StoryAudioPlayer({ src }: { src: string }) {
  return (
    <AudioPlayer
      src={src}
      showJumpControls={false}
      customAdditionalControls={[]}
      customVolumeControls={[]}
      style={{
        background: '#FFF8F0',
        border: '1px solid #E7DCC9',
        borderRadius: '14px',
      }}
    />
  );
}
