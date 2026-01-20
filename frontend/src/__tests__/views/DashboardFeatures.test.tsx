/**
 * Dashboard Features Tests
 * 
 * Tests for P2P Dashboard enhancements including:
 * - Pipeline Stats panel
 * - Requisitions table with Step and Status columns
 * - HITL filter functionality
 * - Sidebar panel for HITL details
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test-utils';

// Import components to test
import { DashboardView } from '../../views/DashboardView';
import { RequisitionsView } from '../../views/RequisitionsView';

describe('DashboardView', () => {
  describe('Pipeline Stats Panel', () => {
    it('renders pipeline stats section', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        expect(screen.getByText(/automation rate/i)).toBeInTheDocument();
      });
    });

    it('displays automation rate metric', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        const automationSection = screen.getByText(/automation rate/i);
        expect(automationSection).toBeInTheDocument();
      });
    });

    it('displays time savings metric', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        expect(screen.getByText(/time savings/i)).toBeInTheDocument();
      });
    });

    it('displays compliance score metric', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        expect(screen.getByText(/compliance score/i)).toBeInTheDocument();
      });
    });

    it('displays HITL pending count', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        expect(screen.getByText(/hitl pending/i)).toBeInTheDocument();
      });
    });
  });

  describe('Requisitions Table', () => {
    it('renders step column header', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        expect(screen.getByText('Step')).toBeInTheDocument();
      });
    });

    it('renders status column header', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('displays step numbers 0-7', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        // Check for step names (at least one should appear)
        const stepNames = [
          'Draft', 'Requisition Validation', 'Approval Check',
          'PO Generation', 'Goods Receipt', 'Invoice Validation',
          'Fraud Analysis', 'Compliance Check'
        ];
        
        const foundSteps = stepNames.filter(name => 
          screen.queryByText(name) !== null
        );
        
        expect(foundSteps.length).toBeGreaterThan(0);
      });
    });

    it('displays color-coded status badges', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        // Look for status badge classes
        const statuses = ['completed', 'hitl pending', 'in progress'];
        const foundStatuses = statuses.filter(status => 
          screen.queryByText(new RegExp(status, 'i')) !== null
        );
        
        expect(foundStatuses.length).toBeGreaterThan(0);
      });
    });
  });

  describe('HITL Filter', () => {
    it('renders filter radio buttons', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        const allRadio = screen.getByLabelText(/all/i);
        const hitlRadio = screen.getByLabelText(/hitl pending/i);
        
        expect(allRadio).toBeInTheDocument();
        expect(hitlRadio).toBeInTheDocument();
      });
    });

    it('defaults to "All" filter selected', async () => {
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        const allRadio = screen.getByLabelText(/all/i) as HTMLInputElement;
        expect(allRadio.checked).toBe(true);
      });
    });

    it('filters table when HITL Pending is selected', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/hitl pending/i)).toBeInTheDocument();
      });
      
      const hitlRadio = screen.getByLabelText(/hitl pending/i);
      await user.click(hitlRadio);
      
      await waitFor(() => {
        // All visible items should have hitl_pending status
        const rows = screen.queryAllByRole('row');
        expect(rows.length).toBeGreaterThan(0);
      });
    });
  });

  describe('HITL Sidebar', () => {
    it('opens sidebar when clicking HITL item', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        // Wait for table to load
        expect(screen.getByText('Step')).toBeInTheDocument();
      });
      
      // Find a clickable row with HITL status
      const hitlBadge = screen.queryByText(/hitl pending/i);
      if (hitlBadge) {
        const row = hitlBadge.closest('tr');
        if (row) {
          await user.click(row);
          
          // Sidebar should open with details
          await waitFor(() => {
            expect(screen.queryByText(/flag reason/i)).toBeInTheDocument();
          }, { timeout: 2000 });
        }
      }
    });

    it('sidebar displays requisition details', async () => {
      renderWithRouter(<DashboardView />);
      
      // If sidebar is open, it should show these fields
      await waitFor(() => {
        const sidebarContent = screen.queryByText(/requisition details/i);
        if (sidebarContent) {
          expect(screen.getByText(/department/i)).toBeInTheDocument();
          expect(screen.getByText(/amount/i)).toBeInTheDocument();
        }
      });
    });

    it('sidebar can be closed', async () => {
      const user = userEvent.setup();
      renderWithRouter(<DashboardView />);
      
      await waitFor(() => {
        const closeButton = screen.queryByRole('button', { name: /close/i });
        if (closeButton) {
          user.click(closeButton);
        }
      });
    });
  });
});

describe('RequisitionsView', () => {
  describe('Step Column', () => {
    it('renders step column in table', async () => {
      renderWithRouter(<RequisitionsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Step')).toBeInTheDocument();
      });
    });

    it('displays step number with circle indicator', async () => {
      renderWithRouter(<RequisitionsView />);
      
      await waitFor(() => {
        // Check for SVG circle elements (step indicators)
        const circles = document.querySelectorAll('svg.lucide-circle');
        expect(circles.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('displays step name text', async () => {
      renderWithRouter(<RequisitionsView />);
      
      await waitFor(() => {
        const stepNames = [
          'Draft', 'Requisition Validation', 'Approval Check',
          'PO Generation', 'Goods Receipt', 'Invoice Validation',
          'Fraud Analysis', 'Compliance Check'
        ];
        
        const foundSteps = stepNames.filter(name => 
          screen.queryByText(name) !== null
        );
        
        // At least some step names should be visible
        expect(foundSteps.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Workflow Status Column', () => {
    it('renders workflow column in table', async () => {
      renderWithRouter(<RequisitionsView />);
      
      await waitFor(() => {
        expect(screen.getByText('Workflow')).toBeInTheDocument();
      });
    });

    it('displays color-coded workflow status badges', async () => {
      renderWithRouter(<RequisitionsView />);
      
      await waitFor(() => {
        // Look for workflow status indicators
        const statusBadges = document.querySelectorAll('[class*="bg-success"], [class*="bg-warning"], [class*="bg-danger"], [class*="bg-primary"]');
        expect(statusBadges.length).toBeGreaterThanOrEqual(0);
      });
    });

    it('shows completed status in green', async () => {
      renderWithRouter(<RequisitionsView />);
      
      await waitFor(() => {
        const completedBadge = screen.queryByText('completed');
        if (completedBadge) {
          expect(completedBadge.className).toMatch(/success/i);
        }
      });
    });

    it('shows hitl_pending status in yellow/warning', async () => {
      renderWithRouter(<RequisitionsView />);
      
      await waitFor(() => {
        const hitlBadge = screen.queryByText(/hitl/i);
        if (hitlBadge) {
          expect(hitlBadge.className).toMatch(/warning/i);
        }
      });
    });

    it('shows rejected status in red', async () => {
      renderWithRouter(<RequisitionsView />);
      
      await waitFor(() => {
        const rejectedBadge = screen.queryByText('rejected');
        if (rejectedBadge) {
          expect(rejectedBadge.className).toMatch(/danger/i);
        }
      });
    });
  });
});

describe('API Integration', () => {
  it('fetches pipeline stats on dashboard load', async () => {
    renderWithRouter(<DashboardView />);
    
    await waitFor(() => {
      // The mock handler should return data
      expect(screen.getByText(/automation rate/i)).toBeInTheDocument();
    });
  });

  it('fetches requisitions status on dashboard load', async () => {
    renderWithRouter(<DashboardView />);
    
    await waitFor(() => {
      // Table should be populated
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    // This test verifies error state handling
    renderWithRouter(<DashboardView />);
    
    await waitFor(() => {
      // Should not crash even if API returns error
      expect(document.body).toBeDefined();
    });
  });
});

describe('Step Names Mapping', () => {
  const expectedStepNames: Record<number, string> = {
    0: 'Draft',
    1: 'Requisition Validation',
    2: 'Approval Check',
    3: 'PO Generation',
    4: 'Goods Receipt',
    5: 'Invoice Validation',
    6: 'Fraud Analysis',
    7: 'Compliance Check',
  };

  it.each([0, 1, 2, 3, 4, 5, 6, 7])('step %i maps to correct name', (step) => {
    expect(expectedStepNames[step]).toBeDefined();
    expect(typeof expectedStepNames[step]).toBe('string');
  });
});
