import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithRouter } from '../__tests__/test-utils';
import { ComplianceView } from './ComplianceView';

describe('ComplianceView', () => {
  it('renders page title', () => {
    renderWithRouter(<ComplianceView />);
    
    expect(screen.getByText('Compliance & Audit')).toBeInTheDocument();
    expect(screen.getByText('Monitor compliance status and audit trails')).toBeInTheDocument();
  });

  it('renders overview and audit log tabs', () => {
    renderWithRouter(<ComplianceView />);
    
    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /audit log/i })).toBeInTheDocument();
  });

  it('displays compliance metrics on overview tab', async () => {
    renderWithRouter(<ComplianceView />);
    
    await waitFor(() => {
      expect(screen.getByText('342')).toBeInTheDocument(); // compliant_transactions
      expect(screen.getByText('8')).toBeInTheDocument(); // policy_violations
      expect(screen.getByText('3')).toBeInTheDocument(); // high_risk_suppliers
      expect(screen.getByText('97.7%')).toBeInTheDocument(); // compliance_rate
    }, { timeout: 5000 });
  });

  it('displays metric labels', async () => {
    renderWithRouter(<ComplianceView />);
    
    await waitFor(() => {
      expect(screen.getByText('Compliant Transactions')).toBeInTheDocument();
      expect(screen.getByText('Policy Violations')).toBeInTheDocument();
      expect(screen.getByText('High Risk Suppliers')).toBeInTheDocument();
      expect(screen.getByText('Compliance Rate')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays recent violations section', async () => {
    renderWithRouter(<ComplianceView />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Policy Violations')).toBeInTheDocument();
      expect(screen.getByText(/PO exceeds approval limit/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('switches to audit log tab when clicked', async () => {
    renderWithRouter(<ComplianceView />);
    
    await waitFor(() => {
      expect(screen.getByText('Compliant Transactions')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    const auditLogTab = screen.getByRole('button', { name: /audit log/i });
    fireEvent.click(auditLogTab);
    
    await waitFor(() => {
      // Should show audit log entries
      expect(screen.getByText(/created requisition/i)).toBeInTheDocument();
      expect(screen.getByText(/approved requisition/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays audit log entries with user names', async () => {
    renderWithRouter(<ComplianceView />);
    
    const auditLogTab = screen.getByRole('button', { name: /audit log/i });
    fireEvent.click(auditLogTab);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays action badges in audit log', async () => {
    renderWithRouter(<ComplianceView />);
    
    const auditLogTab = screen.getByRole('button', { name: /audit log/i });
    fireEvent.click(auditLogTab);
    
    await waitFor(() => {
      // Use getAllByText since action types appear both in filter options and in badges
      expect(screen.getAllByText('CREATE').length).toBeGreaterThan(1);
      expect(screen.getAllByText('APPROVE').length).toBeGreaterThan(1);
    }, { timeout: 5000 });
  });
});
