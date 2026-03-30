export interface LiveSession {
  id: string;
  contentItemId: string;
  meetingName: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  recordingUrl: string | null;
  participantCount?: number | null;
  maxParticipants?: number | null;
  instructorId?: string | null;
  courseId?: string | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  sentAt: string;
}
