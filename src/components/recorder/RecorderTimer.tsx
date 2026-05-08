'use client';

interface Props {
  seconds: number;
}

export function RecorderTimer({ seconds }: Props) {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return (
    <div className="text-3xl font-semibold text-center tabular-nums">
      {m}:{s}
    </div>
  );
}
