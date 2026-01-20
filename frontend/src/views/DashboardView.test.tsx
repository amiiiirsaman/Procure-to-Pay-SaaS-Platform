import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouter } from '../__tests__/test-utils';
import { DashboardView } from './DashboardView';

describe('DashboardView', () => {
  it('renders loading state initially', () => {
    const { container } = renderWithRouter(<DashboardView />);
    
    // Should show loading spinner (animated svg)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders dashboard metrics after loading', async () => {
    const { container } = renderWithRouter(<DashboardView />);
    
    // Wait for loading to complete and data to render
    await waitFor(() => {
      expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Check for stat cards
    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    expect(screen.getByText('Open POs')).toBeInTheDocument();
    expect(screen.getByText('Pending Invoices')).toBeInTheDocument();
    expect(screen.getByText('Overdue Invoices')).toBeInTheDocument();
  });

  it('renders spend trend chart section', async () => {
    renderWithRouter(<DashboardView />);
    
    await waitFor(() => {
      expect(screen.getByText('Spend Trend')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('renders spend by category section', async () => {
    renderWithRouter(<DashboardView />);
    
    await waitFor(() => {
      expect(screen.getByText('Spend by Category')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('renders upcoming payments section', async () => {
    renderWithRouter(<DashboardView />);
    
    await waitFor(() => {
      expect(screen.getByText('Upcoming Payments')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('renders recent activity section', async () => {
    renderWithRouter(<DashboardView />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
