import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        noContentItems: 'No content items',
        noModulesAdded: 'No modules added',
        courseContent: 'Course Content',
      };
      return translations[key] ?? key;
    },
  }),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseModuleList } from './CourseDetailPage.modules';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const COURSE_ID = 'course-1';

const MOCK_MODULES = [
  {
    id: 'mod-1',
    title: 'Module One',
    orderIndex: 1,
    contentItems: [
      {
        id: 'ci-1',
        title: 'Intro Video',
        contentType: 'VIDEO',
        duration: 120,
        orderIndex: 0,
      },
      {
        id: 'ci-2',
        title: 'Reading',
        contentType: 'PDF',
        duration: null,
        orderIndex: 1,
      },
    ],
  },
  {
    id: 'mod-2',
    title: 'Module Two',
    orderIndex: 2,
    contentItems: [],
  },
];

const renderList = (modules = MOCK_MODULES) =>
  render(
    <MemoryRouter>
      <CourseModuleList modules={modules} courseId={COURSE_ID} />
    </MemoryRouter>
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseModuleList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "No modules added" when modules array is empty', () => {
    renderList([]);
    expect(screen.getByText('No modules added')).toBeInTheDocument();
  });

  it('renders the "Course Content" heading when modules exist', () => {
    renderList();
    expect(screen.getByText('Course Content')).toBeInTheDocument();
  });

  it('renders all module titles', () => {
    renderList();
    expect(screen.getByText('Module One')).toBeInTheDocument();
    expect(screen.getByText('Module Two')).toBeInTheDocument();
  });

  it('renders first module open by default showing its content items', () => {
    renderList();
    expect(screen.getByText('Intro Video')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('shows item count badge for each module', () => {
    renderList();
    expect(screen.getByText('2 items')).toBeInTheDocument();
    expect(screen.getByText('0 items')).toBeInTheDocument();
  });

  it('toggles module closed when header is clicked', () => {
    renderList();
    // First module is open; clicking its header should close it
    const moduleOneHeader = screen
      .getByText('Module One')
      .closest('[class*="cursor-pointer"]')!;
    fireEvent.click(moduleOneHeader);
    expect(screen.queryByText('Intro Video')).not.toBeInTheDocument();
  });

  it('opens second (closed) module when its header is clicked', () => {
    renderList();
    const moduleTwoHeader = screen
      .getByText('Module Two')
      .closest('[class*="cursor-pointer"]')!;
    fireEvent.click(moduleTwoHeader);
    expect(screen.getByText('No content items')).toBeInTheDocument();
  });

  it('navigates to /learn/:id for VIDEO content type', () => {
    renderList();
    fireEvent.click(screen.getByText('Intro Video'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/learn/ci-1')
    );
  });

  it('navigates to /document/:id for PDF content type', () => {
    renderList();
    fireEvent.click(screen.getByText('Reading'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/document/ci-2')
    );
  });

  it('renders duration for content items with duration', () => {
    renderList();
    expect(screen.getByText('2m 0s')).toBeInTheDocument();
  });

  it('navigates to /quiz/:id for QUIZ content type', () => {
    const modulesWithQuiz = [
      {
        id: 'mod-q',
        title: 'Quiz Module',
        orderIndex: 0,
        contentItems: [
          {
            id: 'ci-q',
            title: 'Final Quiz',
            contentType: 'QUIZ',
            duration: null,
            orderIndex: 0,
          },
        ],
      },
    ];
    renderList(modulesWithQuiz);
    fireEvent.click(screen.getByText('Final Quiz'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/quiz/ci-q')
    );
  });
});
