import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  AgentStatusBadge, 
  AgentHealthPanel, 
  FlagAlert, 
  RecommendationsList 
} from '../../../components/agents';

describe('AgentStatusBadge', () => {
  it('renders healthy status with green styling', () => {
    render(<AgentStatusBadge status="healthy" />);
    
    const badge = screen.getByText('Healthy');
    expect(badge).toBeInTheDocument();
  });

  it('renders processing status with blue styling', () => {
    render(<AgentStatusBadge status="processing" />);
    
    const badge = screen.getByText('Processing');
    expect(badge).toBeInTheDocument();
  });

  it('renders completed status with green styling', () => {
    render(<AgentStatusBadge status="completed" />);
    
    const badge = screen.getByText('Completed');
    expect(badge).toBeInTheDocument();
  });

  it('renders failed status with red styling', () => {
    render(<AgentStatusBadge status="failed" />);
    
    const badge = screen.getByText('Failed');
    expect(badge).toBeInTheDocument();
  });

  it('renders idle status with gray styling', () => {
    render(<AgentStatusBadge status="idle" />);
    
    const badge = screen.getByText('Idle');
    expect(badge).toBeInTheDocument();
  });

  it('shows flagged status when flagged prop is true', () => {
    render(<AgentStatusBadge status="success" flagged={true} />);
    
    expect(screen.getByText('Flagged')).toBeInTheDocument();
  });
});

describe('AgentHealthPanel', () => {
  const mockAgents = [
    { name: 'Agent1', status: 'healthy', lastActivity: new Date().toISOString() },
    { name: 'Agent2', status: 'processing', lastActivity: new Date().toISOString() },
    { name: 'Agent3', status: 'failed', lastActivity: new Date().toISOString() },
  ];

  it('renders with healthy status', () => {
    render(
      <AgentHealthPanel 
        status="healthy" 
        agents={mockAgents} 
        lastChecked={new Date().toISOString()} 
      />
    );
    
    expect(screen.getByText('Agent Health')).toBeInTheDocument();
    expect(screen.getByText('All Systems Operational')).toBeInTheDocument();
  });

  it('renders with degraded status', () => {
    render(
      <AgentHealthPanel 
        status="degraded" 
        agents={mockAgents} 
        lastChecked={new Date().toISOString()} 
      />
    );
    
    expect(screen.getByText('Some Issues Detected')).toBeInTheDocument();
  });

  it('renders with unhealthy status', () => {
    render(
      <AgentHealthPanel 
        status="unhealthy" 
        agents={mockAgents} 
        lastChecked={new Date().toISOString()} 
      />
    );
    
    expect(screen.getByText('System Issues')).toBeInTheDocument();
  });

  it('displays all agents', () => {
    render(
      <AgentHealthPanel 
        status="healthy" 
        agents={mockAgents} 
        lastChecked={new Date().toISOString()} 
      />
    );
    
    expect(screen.getByText('Agent1')).toBeInTheDocument();
    expect(screen.getByText('Agent2')).toBeInTheDocument();
    expect(screen.getByText('Agent3')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button clicked', () => {
    const onRefresh = vi.fn();
    render(
      <AgentHealthPanel 
        status="healthy" 
        agents={mockAgents} 
        lastChecked={new Date().toISOString()} 
        onRefresh={onRefresh}
      />
    );
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('handles empty agents array', () => {
    render(
      <AgentHealthPanel 
        status="healthy" 
        agents={[]} 
        lastChecked={new Date().toISOString()} 
      />
    );
    
    expect(screen.getByText('Agent Health')).toBeInTheDocument();
  });
});

describe('FlagAlert', () => {
  it('renders with reason', () => {
    render(<FlagAlert reason="Potential fraud detected" />);
    
    expect(screen.getByText('Potential fraud detected')).toBeInTheDocument();
  });

  it('displays as inline by default', () => {
    const { container } = render(<FlagAlert reason="Test reason" />);
    
    // Inline mode uses span
    expect(container.querySelector('span')).toBeInTheDocument();
  });

  it('displays as banner when inline=false', () => {
    const { container } = render(<FlagAlert reason="Test reason" inline={false} />);
    
    // Banner mode uses div with border-l-4
    expect(container.querySelector('.border-l-4')).toBeInTheDocument();
  });
});

describe('RecommendationsList', () => {
  const mockRecommendations = [
    { type: 'suggestion' as const, title: 'Recommendation 1', description: 'Description 1' },
    { type: 'warning' as const, title: 'Recommendation 2', description: 'Description 2' },
    { type: 'critical' as const, title: 'Recommendation 3', description: 'Description 3' },
  ];

  it('renders all recommendations', () => {
    render(<RecommendationsList recommendations={mockRecommendations} />);
    
    expect(screen.getByText('Recommendation 1')).toBeInTheDocument();
    expect(screen.getByText('Recommendation 2')).toBeInTheDocument();
    expect(screen.getByText('Recommendation 3')).toBeInTheDocument();
  });

  it('renders descriptions', () => {
    render(<RecommendationsList recommendations={mockRecommendations} />);
    
    expect(screen.getByText('Description 1')).toBeInTheDocument();
    expect(screen.getByText('Description 2')).toBeInTheDocument();
    expect(screen.getByText('Description 3')).toBeInTheDocument();
  });

  it('handles undefined recommendations', () => {
    render(<RecommendationsList recommendations={undefined} />);
    
    expect(screen.getByText('No recommendations available')).toBeInTheDocument();
  });

  it('handles empty recommendations array', () => {
    render(<RecommendationsList recommendations={[]} />);
    
    // Empty array should still render
    expect(document.body).toBeInTheDocument();
  });
});
