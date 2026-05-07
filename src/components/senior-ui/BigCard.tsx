import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export function BigCard({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('bg-white rounded-card p-8 shadow-sm', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
