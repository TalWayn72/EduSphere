import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PersonalGraphView } from './PersonalGraphView';
import { mockPersonalNodes, mockPersonalEdges } from '@/lib/mock-personal-graph';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

function renderComponent(onViewCourse?: (courseId: string) => void) {
  return render(
    <MemoryRouter>
      <PersonalGraphView onViewCourse={onViewCourse} />
    </MemoryRouter>
  );
}

describe('PersonalGraphView', () => {
  it('renders an SVG with personal graph nodes', () => {
    renderComponent();
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders one circle per personal node', () => {
    renderComponent();
    // data-personal-node attribute marks node groups
    const nodeGroups = document.querySelectorAll('[data-personal-node]');
    expect(nodeGroups.length).toBe(mockPersonalNodes.length);
  });

  it('renders a text label for each node', () => {
    renderComponent();
    // All node labels should appear (possibly truncated)
    // Check at least the first node is findable (partially)
    const firstNode = mockPersonalNodes[0];
    const expectedLabel =
      firstNode.label.length > 18
        ? firstNode.label.slice(0, 16) + '…'
        : firstNode.label;
    expect(document.body.textContent).toContain(
      expectedLabel.slice(0, 10)
    );
  });

  it('shows detail panel with course name and excerpt when a node is clicked', () => {
    renderComponent();
    const firstNodeGroup = document.querySelector('[data-personal-node]');
    expect(firstNodeGroup).toBeTruthy();
    fireEvent.click(firstNodeGroup!);
    const firstNode = mockPersonalNodes[0];
    // Course name appears in both legend and detail panel — just verify body text
    expect(document.body.textContent).toContain(firstNode.courseName);
    expect(
      document.body.textContent
    ).toContain(firstNode.excerpt.slice(0, 20));
  });

  it('shows connected concepts after clicking a node with edges', () => {
    renderComponent();
    // Click node 'pn-1' which has multiple edges
    const pn1 = document.querySelector('[data-personal-node="pn-1"]');
    expect(pn1).toBeTruthy();
    fireEvent.click(pn1!);
    // Edge pn-1 → pn-2 shares concept "Free Will"
    const sharedConcept = mockPersonalEdges.find(
      (e) => (e.source === 'pn-1' || e.target === 'pn-1') && e.sharedConcept
    );
    if (sharedConcept) {
      expect(document.body.textContent).toContain(sharedConcept.sharedConcept);
    }
  });

  it('deselects node when clicking it a second time', () => {
    renderComponent();
    const pn1 = document.querySelector('[data-personal-node="pn-1"]');
    fireEvent.click(pn1!);
    // The excerpt appears only when node is selected (not in legend)
    expect(document.body.textContent).toContain(
      mockPersonalNodes[0].excerpt.slice(0, 20)
    );
    // Click again to deselect
    fireEvent.click(pn1!);
    // Detail panel disappears (placeholder shown, excerpt gone)
    expect(
      screen.getByText(/click a node to see your annotation/i)
    ).toBeInTheDocument();
    // Excerpt is gone after deselect
    expect(document.body.textContent).not.toContain(
      mockPersonalNodes[0].excerpt.slice(0, 20)
    );
  });

  it('calls onViewCourse with the correct courseId', () => {
    const onViewCourse = vi.fn();
    renderComponent(onViewCourse);
    const pn1 = document.querySelector('[data-personal-node="pn-1"]');
    fireEvent.click(pn1!);
    const viewCourseBtn = screen.getByText(/view course/i);
    fireEvent.click(viewCourseBtn);
    expect(onViewCourse).toHaveBeenCalledWith(mockPersonalNodes[0].courseId);
  });

  it('renders the course colour legend', () => {
    renderComponent();
    // Unique course names should all appear in legend
    const uniqueCourses = [
      ...new Set(mockPersonalNodes.map((n) => n.courseName)),
    ];
    uniqueCourses.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('displays stat counts correctly', () => {
    renderComponent();
    expect(
      screen.getByText(String(mockPersonalNodes.length))
    ).toBeInTheDocument();
  });

  it('shows formatted timestamp for nodes with contentTimestamp', () => {
    renderComponent();
    // pn-1 has contentTimestamp: 312 → 5:12
    const pn1Node = mockPersonalNodes.find((n) => n.id === 'pn-1');
    if (pn1Node?.contentTimestamp !== undefined) {
      const pn1Group = document.querySelector('[data-personal-node="pn-1"]');
      fireEvent.click(pn1Group!);
      expect(document.body.textContent).toContain('5:12');
    }
  });
});
