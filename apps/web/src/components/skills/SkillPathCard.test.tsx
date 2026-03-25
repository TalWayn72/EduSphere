import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/ui/card', () => ({ Card: (p: any) => <div {...p} />, CardContent: (p: any) => <div {...p} />, CardHeader: (p: any) => <div {...p} />, CardTitle: (p: any) => <h3 {...p} /> }));
vi.mock('@/components/ui/badge', () => ({ Badge: (p: any) => <span {...p} /> }));
vi.mock('@/components/ui/progress', () => ({ Progress: (p: any) => <div role='progressbar' data-value={p.value} /> }));
vi.mock('@/components/ui/button', () => ({ Button: (p: any) => <button {...p} /> }));
vi.mock('lucide-react', () => ({ Clock: () => <span />, ChevronDown: () => <span />, ChevronUp: () => <span />, Target: () => <span /> }));

import { SkillPathCard } from './SkillPathCard';

const PATH = { id: "sp-1", title: "React Path", description: "Learn React", targetRole: "Frontend Dev", skillIds: ["s1", "s2"], estimatedHours: 40, isPublished: true };
const PROGRESS = [{ skillId: "s1", masteryLevel: "INTERMEDIATE", evidenceCount: 3, lastActivityAt: null }];

describe('SkillPathCard', () => {
  it('renders skill path title', () => {
    render(<MemoryRouter><SkillPathCard path={PATH} progress={PROGRESS} /></MemoryRouter>);
    expect(screen.getByText("React Path")).toBeInTheDocument();
  });

  it('shows target role', () => {
    render(<MemoryRouter><SkillPathCard path={PATH} progress={PROGRESS} /></MemoryRouter>);
    expect(screen.getByText("Frontend Dev")).toBeInTheDocument();
  });
});