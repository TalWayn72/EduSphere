import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock AnnotationForm to avoid Radix Select portal issues
vi.mock("./AnnotationForm", () => ({
  AnnotationForm: ({ onCancel }: { onCancel: () => void }) => (
    <div data-testid="annotation-form">
      <button onClick={onCancel}>Cancel Form</button>
    </div>
  ),
}));

import { AnnotationItem } from "./AnnotationItem";
import { AnnotationLayer } from "@/types/annotations";
import type { Annotation } from "@/types/annotations";

const ANN: Annotation = {
  id: "a1",
  content: "Test annotation content",
  layer: AnnotationLayer.PERSONAL,
  userId: "u1",
  userName: "Alice",
  userRole: "student",
  timestamp: "00:01:30",
  contentId: "c1",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  replies: [],
};

const defaultProps = {
  annotation: ANN,
  currentUserId: "u1",
  currentUserRole: "student" as const,
  onReply: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe("AnnotationItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders annotation content", () => {
    render(<AnnotationItem {...defaultProps} />);
    expect(screen.getByText("Test annotation content")).toBeInTheDocument();
  });

  it("renders the username", () => {
    render(<AnnotationItem {...defaultProps} />);
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("shows (You) for owner", () => {
    render(<AnnotationItem {...defaultProps} />);
    expect(screen.getByText(/(You)/)).toBeInTheDocument();
  });

  it("shows timestamp badge", () => {
    render(<AnnotationItem {...defaultProps} />);
    expect(screen.getByText("00:01:30")).toBeInTheDocument();
  });

  it("shows Edit button for owner", () => {
    render(<AnnotationItem {...defaultProps} />);
    expect(screen.getByText("Edit")).toBeInTheDocument();
  });

  it("shows Delete button for owner", () => {
    render(<AnnotationItem {...defaultProps} />);
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls onDelete when Delete button is clicked", () => {
    render(<AnnotationItem {...defaultProps} />);
    fireEvent.click(screen.getByText("Delete"));
    expect(defaultProps.onDelete).toHaveBeenCalledWith("a1");
  });

  it("shows Reply button", () => {
    render(<AnnotationItem {...defaultProps} />);
    expect(screen.getByText("Reply")).toBeInTheDocument();
  });

  it("clicking Reply reveals annotation form", () => {
    render(<AnnotationItem {...defaultProps} />);
    fireEvent.click(screen.getByText("Reply"));
    expect(screen.getByTestId("annotation-form")).toBeInTheDocument();
  });

  it("does not show Edit/Delete for non-owner", () => {
    render(<AnnotationItem {...defaultProps} currentUserId="other-user" />);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });
});