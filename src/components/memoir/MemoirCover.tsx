import { BigText } from '@/components/senior-ui';

interface Props {
  seniorDisplayName: string;
  generatedAt: Date;
}

export function MemoirCover({ seniorDisplayName, generatedAt }: Props) {
  const dateStr = generatedAt.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return (
    <section className="memoir-cover flex flex-col items-center justify-center text-center py-24 page-break-after">
      <p className="text-body opacity-50 uppercase tracking-widest mb-4">A life in stories</p>
      <BigText size="display" as="h1" className="font-serif">
        {seniorDisplayName}
      </BigText>
      <p className="mt-6 opacity-60 italic">{dateStr}</p>
    </section>
  );
}
