import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BigButton } from '@/components/senior-ui/BigButton';
import { BigCard } from '@/components/senior-ui/BigCard';
import { BigText } from '@/components/senior-ui/BigText';

describe('BigButton', () => {
  it('renders children and meets 60px min-height', () => {
    render(<BigButton>Tap to record</BigButton>);
    const btn = screen.getByRole('button', { name: /tap to record/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('min-h-touch-target');
  });

  it('applies coral styling for primary variant', () => {
    render(<BigButton variant="primary">Save</BigButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-soft-coral');
  });

  it('applies outline styling for secondary variant', () => {
    render(<BigButton variant="secondary">Cancel</BigButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-deep-navy');
  });
});

describe('BigCard', () => {
  it('renders children with rounded card surface', () => {
    render(<BigCard><p>Inside</p></BigCard>);
    expect(screen.getByText('Inside')).toBeInTheDocument();
  });
});

describe('BigText', () => {
  it('renders question size at 24px+', () => {
    render(<BigText size="question">A question</BigText>);
    const el = screen.getByText('A question');
    expect(el.className).toContain('text-question');
  });
});
