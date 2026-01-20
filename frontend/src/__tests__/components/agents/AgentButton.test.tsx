import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentButton } from '../../../components/agents';

describe('AgentButton', () => {
  it('renders with default props', () => {
    render(<AgentButton label="Test Agent" onClick={() => {}} />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
  });

  it('shows loading spinner when loading', () => {
    render(<AgentButton label="Test Agent" onClick={() => {}} loading={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<AgentButton label="Test Agent" onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<AgentButton label="Test Agent" onClick={handleClick} disabled={true} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not call onClick when loading', () => {
    const handleClick = vi.fn();
    render(<AgentButton label="Test Agent" onClick={handleClick} loading={true} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with different variants', () => {
    const { rerender } = render(
      <AgentButton label="Primary" onClick={() => {}} variant="primary" />
    );
    expect(screen.getByRole('button')).toHaveClass('bg-primary-500');

    rerender(<AgentButton label="Secondary" onClick={() => {}} variant="secondary" />);
    expect(screen.getByRole('button')).toHaveClass('border-surface-300');

    rerender(<AgentButton label="Ghost" onClick={() => {}} variant="ghost" />);
    expect(screen.getByRole('button')).toHaveClass('text-primary-600');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <AgentButton label="Small" onClick={() => {}} size="sm" />
    );
    expect(screen.getByRole('button')).toHaveClass('text-xs');

    rerender(<AgentButton label="Medium" onClick={() => {}} size="md" />);
    expect(screen.getByRole('button')).toHaveClass('text-sm');

    rerender(<AgentButton label="Large" onClick={() => {}} size="lg" />);
    expect(screen.getByRole('button')).toHaveClass('text-base');
  });

  it('applies custom className', () => {
    render(
      <AgentButton 
        label="Custom" 
        onClick={() => {}} 
        className="custom-class" 
      />
    );
    
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('handles async onClick', async () => {
    const handleClick = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<AgentButton label="Async" onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
