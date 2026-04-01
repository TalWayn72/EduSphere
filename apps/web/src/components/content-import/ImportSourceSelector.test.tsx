import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('lucide-react', () => ({
  Youtube: () => <span>YT</span>,
  Globe: () => <span>Globe</span>,
  FolderOpen: () => <span>Folder</span>,
  HardDrive: () => <span>Drive</span>,
}));

import { ImportSourceSelector } from './ImportSourceSelector';

describe('ImportSourceSelector', () => {
  it('renders all 4 source options', () => {
    render(<ImportSourceSelector selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText('YouTube Playlist')).toBeInTheDocument();
    expect(screen.getByText('Website / Blog')).toBeInTheDocument();
    expect(screen.getByText('Upload Folder / ZIP')).toBeInTheDocument();
    expect(screen.getByText('Google Drive')).toBeInTheDocument();
  });

  it('calls onSelect when option clicked', () => {
    const onSelect = vi.fn();
    render(<ImportSourceSelector selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('YouTube Playlist'));
    expect(onSelect).toHaveBeenCalledWith('youtube');
  });

  it('deselects when clicking selected option', () => {
    const onSelect = vi.fn();
    render(<ImportSourceSelector selected="youtube" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('YouTube Playlist'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('selected option has aria-pressed=true', () => {
    render(<ImportSourceSelector selected="website" onSelect={vi.fn()} />);
    expect(
      screen.getByText('Website / Blog').closest('button')
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
