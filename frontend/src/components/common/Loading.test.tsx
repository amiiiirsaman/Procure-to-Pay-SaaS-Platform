import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, LoadingOverlay, TableSkeleton } from './Loading';

describe('LoadingSpinner', () => {
  it('renders spinner', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('animate-spin');
  });

  it('applies size classes to wrapper', () => {
    const { container, rerender } = render(<LoadingSpinner size="sm" />);
    expect(container.firstChild).toHaveClass('w-4', 'h-4');
    
    rerender(<LoadingSpinner size="lg" />);
    expect(container.firstChild).toHaveClass('w-12', 'h-12');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSpinner className="text-red-500" />);
    expect(container.firstChild).toHaveClass('text-red-500');
  });
});

describe('LoadingOverlay', () => {
  it('renders with default loading message', () => {
    render(<LoadingOverlay />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingOverlay message="Please wait..." />);
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders spinner', () => {
    const { container } = render(<LoadingOverlay />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('TableSkeleton', () => {
  it('renders correct number of rows', () => {
    const { container } = render(<TableSkeleton rows={3} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('renders 5 columns per row', () => {
    const { container } = render(<TableSkeleton />);
    const firstRow = container.querySelector('tbody tr');
    const cells = firstRow?.querySelectorAll('td');
    expect(cells).toHaveLength(5);
  });

  it('renders header cells', () => {
    const { container } = render(<TableSkeleton />);
    const headerCells = container.querySelectorAll('thead th');
    expect(headerCells).toHaveLength(5);
  });
});
