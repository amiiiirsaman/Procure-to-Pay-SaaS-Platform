import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}} title="Test">
        Content
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        Content
      </Modal>
    );
    
    // Find the close button (it's the only button in the header)
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Modal isOpen={true} onClose={handleClose} title="Test">
        Content
      </Modal>
    );
    
    const overlay = container.querySelector('.modal-overlay');
    fireEvent.click(overlay!);
    
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('renders footer when provided', () => {
    render(
      <Modal 
        isOpen={true} 
        onClose={() => {}} 
        title="Test"
        footer={<button>Save</button>}
      >
        Content
      </Modal>
    );
    
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('applies size variants correctly', () => {
    const { container, rerender } = render(
      <Modal isOpen={true} onClose={() => {}} title="Test" size="sm">
        Content
      </Modal>
    );
    
    expect(container.querySelector('.max-w-sm')).toBeInTheDocument();
    
    rerender(
      <Modal isOpen={true} onClose={() => {}} title="Test" size="xl">
        Content
      </Modal>
    );
    
    expect(container.querySelector('.max-w-4xl')).toBeInTheDocument();
  });
});
