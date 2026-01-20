import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, RiskBadge, UrgencyBadge, ApprovalBadge, MatchBadge } from './Badges';

describe('StatusBadge', () => {
  it('renders DRAFT status correctly', () => {
    render(<StatusBadge status="DRAFT" />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders PENDING_APPROVAL status correctly', () => {
    render(<StatusBadge status="PENDING_APPROVAL" />);
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
  });

  it('renders APPROVED status correctly', () => {
    render(<StatusBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders REJECTED status correctly', () => {
    render(<StatusBadge status="REJECTED" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });
});

describe('RiskBadge', () => {
  it('renders LOW risk level', () => {
    render(<RiskBadge level="LOW" />);
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
  });

  it('renders HIGH risk level', () => {
    render(<RiskBadge level="HIGH" />);
    expect(screen.getByText('High Risk')).toBeInTheDocument();
  });

  it('renders CRITICAL risk level', () => {
    render(<RiskBadge level="CRITICAL" />);
    expect(screen.getByText('Critical Risk')).toBeInTheDocument();
  });
});

describe('UrgencyBadge', () => {
  it('renders STANDARD urgency', () => {
    render(<UrgencyBadge urgency="STANDARD" />);
    expect(screen.getByText('Standard')).toBeInTheDocument();
  });

  it('renders URGENT urgency', () => {
    render(<UrgencyBadge urgency="URGENT" />);
    expect(screen.getByText('Urgent')).toBeInTheDocument();
  });

  it('renders EMERGENCY urgency', () => {
    render(<UrgencyBadge urgency="EMERGENCY" />);
    expect(screen.getByText('Emergency')).toBeInTheDocument();
  });
});

describe('MatchBadge', () => {
  it('renders PENDING match status', () => {
    render(<MatchBadge status="PENDING" />);
    expect(screen.getByText('Pending Match')).toBeInTheDocument();
  });

  it('renders MATCHED status', () => {
    render(<MatchBadge status="MATCHED" />);
    expect(screen.getByText('Matched')).toBeInTheDocument();
  });

  it('renders EXCEPTION status', () => {
    render(<MatchBadge status="EXCEPTION" />);
    expect(screen.getByText('Exception')).toBeInTheDocument();
  });
});

describe('ApprovalBadge', () => {
  it('renders PENDING approval status', () => {
    render(<ApprovalBadge status="PENDING" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders APPROVED approval status', () => {
    render(<ApprovalBadge status="APPROVED" />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders REJECTED approval status', () => {
    render(<ApprovalBadge status="REJECTED" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });
});
