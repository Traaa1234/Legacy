import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

type Size = 'body' | 'question' | 'display';

interface BigTextProps extends HTMLAttributes<HTMLParagraphElement> {
  size?: Size;
  as?: 'p' | 'h1' | 'h2' | 'h3';
}

export function BigText({
  size = 'body',
  as: Tag = 'p',
  className,
  children,
  ...rest
}: BigTextProps) {
  const sizes: Record<Size, string> = {
    body: 'text-body',
    question: 'text-question',
    display: 'text-display font-serif',
  };
  return (
    <Tag className={clsx(sizes[size], className)} {...rest}>
      {children}
    </Tag>
  );
}
