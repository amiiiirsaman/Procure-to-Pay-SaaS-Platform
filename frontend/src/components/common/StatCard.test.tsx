import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatCard } from './StatCard';
import { DollarSign } from 'lucide-react';

describe('StatCard', () => {
  const defaultProps = {
    title: 'Revenue',
    value: '$50,000',
    icon: <DollarSign />,
  };

  it('renders title and value', () => {
    render(<StatCard {...defaultProps} />);
    
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatCard {...defaultProps} subtitle="This month" />);
    expect(screen.getByText('This month')).toBeInTheDocument();
  });

  it('renders icon', () => {
    const { container } = render(<StatCard {...defaultProps} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders trend with positive styling', () => {
    const { container } = render(
      <StatCard 
        {...defaultProps}
        trend={{ value: 12.5, label: 'vs last month', isPositive: true }}
      />
    );
    
    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
    expect(screen.getByText('vs last month')).toBeInTheDocument();
    const trendElement = container.querySelector('.text-success-600');
    expect(trendElement).toBeInTheDocument();
    expect(trendElement?.textContent).toContain('12.5');
  });

  it('renders trend with negative styling', () => {
    const { container } = render(
      <StatCard 
        {...defaultProps}
        trend={{ value: -5.2, label: 'vs last month', isPositive: false }}
      />
    );
    
    const trendElement = container.querySelector('.text-danger-600');
    expect(trendElement).toBeInTheDocument();
    expect(trendElement?.textContent).toContain('5.2');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<StatCard {...defaultProps} onClick={handleClick} />);
    
    const card = screen.getByText('Revenue').closest('div.stat-card');
    fireEvent.click(card!);
    
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies icon color classes', () => {
    const { container, rerender } = render(
      <StatCard {...defaultProps} iconColor="success" />
    );
    
    expect(container.querySelector('.stat-icon-success')).toBeInTheDocument();
    
    rerender(<StatCard {...defaultProps} iconColor="danger" />);
    expect(container.querySelector('.stat-icon-danger')).toBeInTheDocument();
  });
});
