export const XAPI_VERBS = {
  completed:  { id: 'http://adlnet.gov/expapi/verbs/completed',  display: { 'en-US': 'completed' } },
  registered: { id: 'http://adlnet.gov/expapi/verbs/registered', display: { 'en-US': 'registered' } },
  attended:   { id: 'http://adlnet.gov/expapi/verbs/attended',   display: { 'en-US': 'attended' } },
  launched:   { id: 'http://adlnet.gov/expapi/verbs/launched',   display: { 'en-US': 'launched' } },
  attempted:  { id: 'http://adlnet.gov/expapi/verbs/attempted',  display: { 'en-US': 'attempted' } },
  responded:  { id: 'http://adlnet.gov/expapi/verbs/responded',  display: { 'en-US': 'responded' } },
} as const;

type VerbKey = keyof typeof XAPI_VERBS;

const SUBJECT_TO_VERB: Record<string, VerbKey> = {
  'EDUSPHERE.course.completed':            'completed',
  'EDUSPHERE.course.enrolled':             'registered',
  'EDUSPHERE.sessions.ended':              'attended',
  'EDUSPHERE.sessions.participant.joined': 'launched',
  'EDUSPHERE.submission.created':          'attempted',
  'EDUSPHERE.poll.voted':                  'responded',
};

export function natsToXapiStatement(subject: string, payload: Record<string, unknown>): object {
  const verbKey: VerbKey = (SUBJECT_TO_VERB[subject] as VerbKey | undefined) ?? 'launched';
  const activityId = (payload['courseId'] ?? payload['sessionId'] ?? payload['id'] ?? 'unknown') as string;
  const activityName = (payload['courseName'] ?? payload['title'] ?? subject) as string;
  return {
    actor: {
      objectType: 'Agent',
      account: { homePage: 'https://edusphere.io', name: payload['userId'] as string },
    },
    verb: XAPI_VERBS[verbKey],
    object: {
      objectType: 'Activity',
      id: `https://edusphere.io/activities/${activityId}`,
      definition: { name: { 'en-US': activityName } },
    },
    context: { platform: 'EduSphere', language: 'en-US' },
    timestamp: new Date().toISOString(),
  };
}
