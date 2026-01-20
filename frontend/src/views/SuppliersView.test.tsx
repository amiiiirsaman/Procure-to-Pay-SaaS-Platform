import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouter } from '../__tests__/test-utils';
import { SuppliersView } from './SuppliersView';

describe('SuppliersView', () => {
  it('renders page title', () => {
    renderWithRouter(<SuppliersView />);
    
    expect(screen.getByText('Suppliers')).toBeInTheDocument();
    expect(screen.getByText('Manage vendor relationships and contracts')).toBeInTheDocument();
  });

  it('renders add supplier button', () => {
    renderWithRouter(<SuppliersView />);
    
    expect(screen.getByRole('button', { name: /add supplier/i })).toBeInTheDocument();
  });

  it('loads and displays suppliers', async () => {
    renderWithRouter(<SuppliersView />);
    
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Global Materials Inc')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays supplier codes', async () => {
    renderWithRouter(<SuppliersView />);
    
    await waitFor(() => {
      expect(screen.getByText('SUP-001')).toBeInTheDocument();
      expect(screen.getByText('SUP-002')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays risk level badges', async () => {
    renderWithRouter(<SuppliersView />);
    
    await waitFor(() => {
      expect(screen.getByText('Low Risk')).toBeInTheDocument();
      expect(screen.getByText('Medium Risk')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays preferred badge for preferred suppliers', async () => {
    renderWithRouter(<SuppliersView />);
    
    await waitFor(() => {
      expect(screen.getByText('Preferred')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays supplier contact email', async () => {
    renderWithRouter(<SuppliersView />);
    
    await waitFor(() => {
      expect(screen.getByText('sales@acme.com')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays supplier location', async () => {
    renderWithRouter(<SuppliersView />);
    
    await waitFor(() => {
      expect(screen.getByText(/San Francisco, USA/)).toBeInTheDocument();
      expect(screen.getByText(/New York, USA/)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays active status', async () => {
    renderWithRouter(<SuppliersView />);
    
    await waitFor(() => {
      const activeLabels = screen.getAllByText('Active');
      expect(activeLabels.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });
});
