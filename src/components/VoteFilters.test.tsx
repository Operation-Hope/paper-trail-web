/**
 * Tests for VoteFilters component
 * Covers date presets, vote outcome filters, and clearAllFilters
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoteFilters } from './VoteFilters';
import type { VoteValue } from '../types/api';

const defaultProps = {
  billType: '',
  setBillType: vi.fn(),
  sortOrder: 'DESC' as const,
  setSortOrder: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  dateFrom: null as string | null,
  setDateFrom: vi.fn(),
  dateTo: null as string | null,
  setDateTo: vi.fn(),
  voteValues: [] as VoteValue[],
  setVoteValues: vi.fn(),
  clearAllFilters: vi.fn(),
  earliestVoteDate: '2020-01-01',
  latestVoteDate: '2024-12-20',
};

describe('VoteFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Date presets', () => {
    it('applies "All Time" preset correctly', async () => {
      const user = userEvent.setup();
      const setDateFrom = vi.fn();
      const setDateTo = vi.fn();
      
      render(
        <VoteFilters 
          {...defaultProps} 
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
        />
      );
      
      // Expand the filter panel
      const filterToggle = screen.getByRole('button', { name: /filter votes/i });
      await user.click(filterToggle);
      
      const allTimeButton = screen.getByRole('button', { name: /filter by all time/i });
      await user.click(allTimeButton);
      
      // All Time should clear the date filters
      expect(setDateFrom).toHaveBeenCalledWith(null);
      expect(setDateTo).toHaveBeenCalledWith(null);
    });

    it('uses latestVoteDate as end boundary for date presets', async () => {
      const user = userEvent.setup();
      const setDateFrom = vi.fn();
      const setDateTo = vi.fn();
      
      render(
        <VoteFilters 
          {...defaultProps} 
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
          latestVoteDate="2024-12-20"
        />
      );
      
      const filterToggle = screen.getByRole('button', { name: /filter votes/i });
      await user.click(filterToggle);
      
      const last2YearsButton = screen.getByRole('button', { name: /filter by last 2 years/i });
      await user.click(last2YearsButton);
      
      // End date should be latestVoteDate, not today
      expect(setDateTo).toHaveBeenCalledWith('2024-12-20');
    });

    it('has ARIA labels on date preset buttons', async () => {
      const user = userEvent.setup();
      
      render(<VoteFilters {...defaultProps} />);
      
      const filterToggle = screen.getByRole('button', { name: /filter votes/i });
      await user.click(filterToggle);
      
      // Check ARIA labels exist
      expect(screen.getByRole('button', { name: /filter by this congress/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter by last 2 years/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /filter by all time/i })).toBeInTheDocument();
    });
  });

  describe('Vote outcome filters', () => {
    it('calls setVoteValues when vote outcome toggled', async () => {
      const user = userEvent.setup();
      const setVoteValues = vi.fn();
      
      render(
        <VoteFilters 
          {...defaultProps} 
          setVoteValues={setVoteValues}
        />
      );
      
      const filterToggle = screen.getByRole('button', { name: /filter votes/i });
      await user.click(filterToggle);
      
      const yeaButton = screen.getByRole('button', { name: /filter by yea/i });
      await user.click(yeaButton);
      
      expect(setVoteValues).toHaveBeenCalled();
    });

    it('shows pressed state for active vote filters', async () => {
      const user = userEvent.setup();
      
      render(
        <VoteFilters 
          {...defaultProps} 
          voteValues={['Yea', 'Nay']}
        />
      );
      
      const filterToggle = screen.getByRole('button', { name: /filter votes/i });
      await user.click(filterToggle);
      
      const yeaButton = screen.getByRole('button', { name: /filter by yea/i });
      const nayButton = screen.getByRole('button', { name: /filter by nay/i });
      
      expect(yeaButton).toHaveAttribute('aria-pressed', 'true');
      expect(nayButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Clear all filters', () => {
    it('calls clearAllFilters when button clicked', async () => {
      const user = userEvent.setup();
      const clearAllFilters = vi.fn();
      
      render(
        <VoteFilters 
          {...defaultProps} 
          clearAllFilters={clearAllFilters}
          voteValues={['Yea']}
        />
      );
      
      const filterToggle = screen.getByRole('button', { name: /filter votes/i });
      await user.click(filterToggle);
      
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      await user.click(clearButton);
      
      expect(clearAllFilters).toHaveBeenCalled();
    });

    it('disables clear button when no filters active', async () => {
      const user = userEvent.setup();
      
      render(<VoteFilters {...defaultProps} />);
      
      const filterToggle = screen.getByRole('button', { name: /filter votes/i });
      await user.click(filterToggle);
      
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      expect(clearButton).toBeDisabled();
    });

    it('enables clear button when filters are active', async () => {
      const user = userEvent.setup();
      
      render(
        <VoteFilters 
          {...defaultProps} 
          searchQuery="test"
        />
      );
      
      const filterToggle = screen.getByRole('button', { name: /filter votes/i });
      await user.click(filterToggle);
      
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      expect(clearButton).not.toBeDisabled();
    });
  });

  describe('Bill type filters', () => {
    it('calls setBillType when checkbox toggled', async () => {
      const user = userEvent.setup();
      const setBillType = vi.fn();
      
      render(
        <VoteFilters 
          {...defaultProps} 
          setBillType={setBillType}
        />
      );
      
      const filterToggle = screen.getByRole('button', { name: /filter votes/i });
      await user.click(filterToggle);
      
      const houseCheckbox = screen.getByRole('checkbox', { name: /house/i });
      await user.click(houseCheckbox);
      
      expect(setBillType).toHaveBeenCalled();
    });
  });

  describe('Sort order', () => {
    it('renders sort order select', async () => {
      const user = userEvent.setup();
      
      render(<VoteFilters {...defaultProps} />);
      
      const filterToggle = screen.getByRole('button', { name: /filter votes/i });
      await user.click(filterToggle);
      
      // Just verify the combobox exists (Radix UI Select doesn't work well with jsdom for interaction testing)
      const sortSelect = screen.getByRole('combobox');
      expect(sortSelect).toBeInTheDocument();
    });
  });

  describe('Active filter count', () => {
    it('shows badge with active filter count', async () => {
      render(
        <VoteFilters 
          {...defaultProps} 
          searchQuery="test"
          voteValues={['Yea', 'Nay']}
          dateFrom="2024-01-01"
        />
      );
      
      // Badge should show count without expanding (4 = 1 search + 2 votes + 1 date)
      const badge = screen.getByText(/4 active/i);
      expect(badge).toBeInTheDocument();
    });
  });
});
