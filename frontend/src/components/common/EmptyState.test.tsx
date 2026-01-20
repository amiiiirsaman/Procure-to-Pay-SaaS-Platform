import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState, ErrorState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title correctly', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Try creating one" />);
    expect(screen.getByText('Try creating one')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const handleClick = vi.fn();
    render(
      <EmptyState 
        title="Empty" 
        action={{ label: 'Add Item', onClick: handleClick }}
      />
    );
    
    const button = screen.getByRole('button', { name: 'Add Item' });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });
});

describe('ErrorState', () => {
  it('renders default title', () => {
    render(<ErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<ErrorState message="Custom error message" />);
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} />);
    
    const button = screen.getByRole('button', { name: /try again/i });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(handleRetry).toHaveBeenCalledOnce();
  });
});
