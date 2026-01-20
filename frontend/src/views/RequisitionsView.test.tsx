import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouter } from '../__tests__/test-utils';
import { RequisitionsView } from './RequisitionsView';

describe('RequisitionsView', () => {
  it('renders page title', () => {
    renderWithRouter(<RequisitionsView />);
    
    expect(screen.getByText('Requisitions')).toBeInTheDocument();
    expect(screen.getByText('Manage purchase requisitions')).toBeInTheDocument();
  });

  it('renders new requisition button', () => {
    renderWithRouter(<RequisitionsView />);
    
    expect(screen.getByRole('button', { name: /new requisition/i })).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithRouter(<RequisitionsView />);
    
    expect(screen.getByPlaceholderText(/search requisitions/i)).toBeInTheDocument();
  });

  it('renders filter button', () => {
    renderWithRouter(<RequisitionsView />);
    
    expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
  });

  it('loads and displays requisitions', async () => {
    renderWithRouter(<RequisitionsView />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('REQ-2025-001')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Check for requisition data from mock
    expect(screen.getByText('Office Supplies Q1')).toBeInTheDocument();
    expect(screen.getByText('REQ-2025-002')).toBeInTheDocument();
  });

  it('shows filter panel when filter button is clicked', async () => {
    renderWithRouter(<RequisitionsView />);
    
    const filterButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterButton);
    
    // Filter panel should appear
    await waitFor(() => {
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Department')).toBeInTheDocument();
      expect(screen.getByText('Urgency')).toBeInTheDocument();
    });
  });

  it('displays status badges correctly', async () => {
    renderWithRouter(<RequisitionsView />);
    
    await waitFor(() => {
      expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays urgency badges', async () => {
    renderWithRouter(<RequisitionsView />);
    
    await waitFor(() => {
      // Use getAllByText since there may be multiple items with same urgency
      expect(screen.getAllByText('Standard').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Urgent').length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  it('displays pagination info', async () => {
    renderWithRouter(<RequisitionsView />);
    
    await waitFor(() => {
      expect(screen.getByText(/showing 1 to/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
