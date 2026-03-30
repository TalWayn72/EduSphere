export interface GeneratedModule {
  title: string;
  description: string;
  contentItemTitles: string[];
}

export interface GenerateCourseResult {
  generateCourseFromPrompt: {
    executionId: string;
    status: string;
    courseTitle: string | null;
    courseDescription: string | null;
    modules: GeneratedModule[];
  };
}

export interface ExecutionOutputData {
  courseTitle?: string;
  courseDescription?: string;
  modules?: GeneratedModule[];
  error?: string;
}

export interface ExecutionStatusPayload {
  executionStatusChanged: {
    id: string;
    status: string;
    output: ExecutionOutputData | null;
  };
}

export interface AgentExecutionResult {
  agentExecution: {
    id: string;
    status: string;
    output: ExecutionOutputData | null;
  } | null;
}

export interface CreateCourseResult {
  createCourse: { id: string; title: string };
}

export interface AiCourseCreatorModalProps {
  open: boolean;
  onClose: () => void;
}

export interface CourseOutline {
  title: string;
  description: string;
  modules: GeneratedModule[];
}

/** BUG-095: Polling interval for fallback when WebSocket subscription dies. */
export const POLL_INTERVAL_MS = 5000;
/** BUG-095: Hard timeout — stop polling and show error after 5 minutes. */
export const HARD_TIMEOUT_MS = 5 * 60 * 1000;
