import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PoliticianCard } from './PoliticianCard';
import type { Politician } from '../types/api';

const mockPolitician: Politician = {
  canonical_id: 'cand1001',
  first_name: 'John',
  last_name: 'Doe',
  full_name: 'John Doe',
  party: 'Democratic',
  state: 'CA',
  seat: 'Senator',
  is_active: true,
};

describe('PoliticianCard', () => {
  it('renders politician information', () => {
    const onSelect = vi.fn();

    render(<PoliticianCard politician={mockPolitician} onSelect={onSelect} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Democratic')).toBeInTheDocument();
    expect(screen.getByText('CA')).toBeInTheDocument();
    expect(screen.getByText('Senator')).toBeInTheDocument();
  });

  it('calls onSelect when card is clicked in normal mode', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<PoliticianCard politician={mockPolitician} onSelect={onSelect} />);

    const card = screen.getByText('John Doe').closest('.cursor-pointer');
    await user.click(card!);

    expect(onSelect).toHaveBeenCalledWith(mockPolitician);
  });

  it('shows Compare button when onToggleComparison is provided', () => {
    const onSelect = vi.fn();
    const onToggleComparison = vi.fn();

    render(
      <PoliticianCard
        politician={mockPolitician}
        onSelect={onSelect}
        onToggleComparison={onToggleComparison}
      />
    );

    // Use data-slot to find the actual button element, not the card wrapper
    const compareButton = screen.getByText(/compare/i).closest('[data-slot="button"]');
    expect(compareButton).toBeInTheDocument();
  });

  it('calls onToggleComparison when Compare button is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onToggleComparison = vi.fn();

    render(
      <PoliticianCard
        politician={mockPolitician}
        onSelect={onSelect}
        onToggleComparison={onToggleComparison}
      />
    );

    // Use data-slot to find the actual button element, not the card wrapper
    const compareButton = screen.getByText(/compare/i).closest('[data-slot="button"]');
    await user.click(compareButton!);

    expect(onToggleComparison).toHaveBeenCalledWith(mockPolitician);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows Compare button even when comparisonMode is active', () => {
    const onSelect = vi.fn();
    const onToggleComparison = vi.fn();

    render(
      <PoliticianCard
        politician={mockPolitician}
        onSelect={onSelect}
        onToggleComparison={onToggleComparison}
        comparisonMode={true}
      />
    );

    // Use data-slot to find the actual button element, not the card wrapper
    const compareButton = screen.getByText(/compare/i).closest('[data-slot="button"]');
    expect(compareButton).toBeInTheDocument();
  });

  it('shows checkbox when in comparison mode', () => {
    const onSelect = vi.fn();
    const onToggleComparison = vi.fn();

    render(
      <PoliticianCard
        politician={mockPolitician}
        onSelect={onSelect}
        onToggleComparison={onToggleComparison}
        comparisonMode={true}
      />
    );

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('calls onToggleComparison when checkbox is clicked in comparison mode', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onToggleComparison = vi.fn();

    render(
      <PoliticianCard
        politician={mockPolitician}
        onSelect={onSelect}
        onToggleComparison={onToggleComparison}
        comparisonMode={true}
        isSelectedForComparison={false}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    expect(onToggleComparison).toHaveBeenCalledWith(mockPolitician);
  });

  it('calls onToggleComparison when card is clicked in comparison mode', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onToggleComparison = vi.fn();

    render(
      <PoliticianCard
        politician={mockPolitician}
        onSelect={onSelect}
        onToggleComparison={onToggleComparison}
        comparisonMode={true}
      />
    );

    const heading = screen.getByRole('heading', { name: 'John Doe' });
    const card = heading.closest('[data-slot="card"]');
    await user.click(card!);

    expect(onToggleComparison).toHaveBeenCalledWith(mockPolitician);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('highlights card when selected for comparison', () => {
    const onSelect = vi.fn();
    const onToggleComparison = vi.fn();

    const { container } = render(
      <PoliticianCard
        politician={mockPolitician}
        onSelect={onSelect}
        onToggleComparison={onToggleComparison}
        comparisonMode={true}
        isSelectedForComparison={true}
      />
    );

    const card = container.querySelector('.border-primary');
    expect(card).toBeInTheDocument();
  });

  it('checkbox reflects selection state when politician is selected for comparison', () => {
    const onSelect = vi.fn();
    const onToggleComparison = vi.fn();

    render(
      <PoliticianCard
        politician={mockPolitician}
        onSelect={onSelect}
        onToggleComparison={onToggleComparison}
        comparisonMode={true}
        isSelectedForComparison={true}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });
});
