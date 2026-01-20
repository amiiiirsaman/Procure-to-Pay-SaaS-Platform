import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouter } from '../__tests__/test-utils';
import { InvoicesView } from './InvoicesView';

describe('InvoicesView', () => {
  it('renders page title', () => {
    renderWithRouter(<InvoicesView />);
    
    expect(screen.getByText('Invoices')).toBeInTheDocument();
    expect(screen.getByText('Process and manage vendor invoices')).toBeInTheDocument();
  });

  it('renders new invoice button', () => {
    renderWithRouter(<InvoicesView />);
    
    expect(screen.getByRole('button', { name: /new invoice/i })).toBeInTheDocument();
  });

  it('loads and displays invoices', async () => {
    renderWithRouter(<InvoicesView />);
    
    await waitFor(() => {
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument();
      expect(screen.getByText('INV-2025-002')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays vendor invoice numbers', async () => {
    renderWithRouter(<InvoicesView />);
    
    await waitFor(() => {
      expect(screen.getByText('ACME-INV-5001')).toBeInTheDocument();
      expect(screen.getByText('GLOB-2025-100')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays supplier names', async () => {
    renderWithRouter(<InvoicesView />);
    
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Global Materials Inc')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays match status badges', async () => {
    renderWithRouter(<InvoicesView />);
    
    await waitFor(() => {
      expect(screen.getByText('Matched')).toBeInTheDocument();
      expect(screen.getByText('Partial Match')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays risk level badges', async () => {
    renderWithRouter(<InvoicesView />);
    
    await waitFor(() => {
      expect(screen.getByText('Low Risk')).toBeInTheDocument();
      expect(screen.getByText('Medium Risk')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays invoice amounts', async () => {
    renderWithRouter(<InvoicesView />);
    
    await waitFor(() => {
      expect(screen.getByText('$75,000.00')).toBeInTheDocument();
      expect(screen.getByText('$16,200.00')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
