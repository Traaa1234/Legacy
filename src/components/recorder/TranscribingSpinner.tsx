import { BigCard, BigText } from '@/components/senior-ui';

export function TranscribingSpinner() {
  return (
    <BigCard className="text-center py-12">
      <div className="text-5xl animate-pulse mb-4">✍️</div>
      <BigText size="question">We&apos;re writing down your story…</BigText>
      <p className="mt-2 opacity-60">This usually takes about 10 seconds.</p>
    </BigCard>
  );
}
