import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AISuggestionPanel } from '@/components/cbt/AISuggestionPanel';
import { RationalReframe } from '@/types';

const REFRAMES: RationalReframe[] = [
  {
    id: 'reframe-1',
    perspective: 'Compassionate',
    content: 'This was painful, and it makes sense that I need a moment.',
  },
  {
    id: 'reframe-2',
    perspective: 'Balanced',
    content: 'One hard conversation does not define the whole relationship.',
  },
];

describe('AISuggestionPanel', () => {
  it('accepts a reframe suggestion explicitly', () => {
    const onAccept = vi.fn();

    render(
      <AISuggestionPanel
        reframes={REFRAMES}
        acceptedReframeId={null}
        dismissedReframeIds={[]}
        onAccept={onAccept}
        onEdit={vi.fn()}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /accept compassionate reframe/i }));

    expect(onAccept).toHaveBeenCalledWith(REFRAMES[0]);
  });

  it('edits a suggestion before applying it', () => {
    const onEdit = vi.fn();

    render(
      <AISuggestionPanel
        reframes={REFRAMES}
        acceptedReframeId={null}
        dismissedReframeIds={[]}
        onAccept={vi.fn()}
        onEdit={onEdit}
        onDismiss={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /edit balanced reframe/i }));
    fireEvent.change(screen.getByLabelText(/edit balanced reframe/i), {
      target: { value: 'I can ask one clarifying question before deciding what this means.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save balanced reframe edit/i }));

    expect(onEdit).toHaveBeenCalledWith({
      ...REFRAMES[1],
      content: 'I can ask one clarifying question before deciding what this means.',
    });
  });

  it('dismisses a reframe suggestion explicitly', () => {
    const onDismiss = vi.fn();

    render(
      <AISuggestionPanel
        reframes={REFRAMES}
        acceptedReframeId={null}
        dismissedReframeIds={[]}
        onAccept={vi.fn()}
        onEdit={vi.fn()}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /dismiss compassionate reframe/i }));

    expect(onDismiss).toHaveBeenCalledWith('reframe-1');
  });
});
