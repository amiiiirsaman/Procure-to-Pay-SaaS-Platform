import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentResultModal } from '../../../components/agents';

describe('AgentResultModal', () => {
  const defaultProps = {
    isOpen: true,
    agentName: 'TestAgent',
    agentLabel: 'Test Agent Results',
    status: 'success' as const,
    result: { score: 0.95, valid: true },
    notes: [
      { timestamp: new Date().toISOString(), note: 'Test note 1' },
      { timestamp: new Date().toISOString(), note: 'Test note 2' },
    ],
    flagged: false,
    flagReason: undefined,
    onClose: vi.fn(),
  };

  it('renders when isOpen is true', () => {
    render(<AgentResultModal {...defaultProps} />);
    
    expect(screen.getByText('Test Agent Results')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<AgentResultModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Test Agent Results')).not.toBeInTheDocument();
  });

  it('displays completed status correctly', () => {
    render(<AgentResultModal {...defaultProps} status="success" />);
    
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });

  it('displays result data', () => {
    render(<AgentResultModal {...defaultProps} />);
    
    // Result should be displayed
    expect(screen.getByText(/score/i)).toBeInTheDocument();
  });

  it('displays notes when provided', () => {
    render(<AgentResultModal {...defaultProps} />);
    
    expect(screen.getByText('Test note 1')).toBeInTheDocument();
    expect(screen.getByText('Test note 2')).toBeInTheDocument();
  });

  it('shows flag alert when flagged', () => {
    render(
      <AgentResultModal 
        {...defaultProps} 
        flagged={true} 
        flagReason="Potential fraud detected" 
      />
    );
    
    expect(screen.getByText('Potential fraud detected')).toBeInTheDocument();
  });

  it('does not show flag reason when not flagged', () => {
    render(<AgentResultModal {...defaultProps} flagged={false} />);
    
    expect(screen.queryByText('Flagged')).not.toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<AgentResultModal {...defaultProps} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('handles empty notes array', () => {
    render(<AgentResultModal {...defaultProps} notes={[]} />);
    
    expect(screen.getByText('Test Agent Results')).toBeInTheDocument();
  });

  it('handles null result gracefully', () => {
    render(<AgentResultModal {...defaultProps} result={null} />);
    
    expect(screen.getByText('Test Agent Results')).toBeInTheDocument();
  });
});
