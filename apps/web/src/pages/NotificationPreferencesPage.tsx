/* eslint-disable edusphere-design-system/require-page-shell -- multi-section layout */
import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';
import * as urql from 'urql';

const CHANNELS = [
  'inApp',
  'pushWeb',
  'pushMobile',
  'email',
  'whatsapp',
] as const;
type Channel = (typeof CHANNELS)[number];

const CHANNEL_LABELS: Record<Channel, string> = {
  inApp: 'In-App',
  pushWeb: 'Push Web',
  pushMobile: 'Push Mobile',
  email: 'Email',
  whatsapp: 'WhatsApp',
};

interface NotifType {
  key: string;
  label: string;
}
interface Category {
  name: string;
  types: NotifType[];
}

const CATEGORIES: Category[] = [
  {
    name: 'Learning',
    types: [
      { key: 'COURSE_ENROLLED', label: 'Course Enrolled' },
      { key: 'LESSON_AVAILABLE', label: 'Lesson Available' },
      { key: 'SRS_REVIEW_DUE', label: 'SRS Review Due' },
      { key: 'STREAK_REMINDER', label: 'Streak Reminder' },
    ],
  },
  {
    name: 'Social',
    types: [
      { key: 'USER_FOLLOWED', label: 'New Follower' },
      { key: 'PEER_FOLLOWED_ACTIVITY', label: 'Peer Activity' },
      { key: 'DISCUSSION_REPLY', label: 'Discussion Reply' },
    ],
  },
  {
    name: 'Peer Review',
    types: [
      { key: 'PEER_REVIEW_ASSIGNED', label: 'Review Assigned' },
      { key: 'PEER_REVIEW_RECEIVED', label: 'Review Received' },
    ],
  },
  {
    name: 'Achievements',
    types: [{ key: 'BADGE_ISSUED', label: 'Badge Issued' }],
  },
  {
    name: 'Alerts',
    types: [
      { key: 'AT_RISK_ALERT', label: 'At-Risk Alert' },
      { key: 'SESSION_STARTING', label: 'Session Starting' },
      { key: 'ANNOUNCEMENT', label: 'Announcement' },
    ],
  },
];

const PREFS_QUERY = `query MyNotificationPreferences { myNotificationPreferences { notificationType channel enabled } }`;
const UPDATE_MUTATION = `mutation UpdateNotificationPreference($input: UpdateNotificationPreferenceInput!) { updateNotificationPreference(input: $input) { notificationType channel enabled } }`;

type PrefRow = { notificationType: string; channel: string; enabled: boolean };

export function NotificationPreferencesPage() {
  const [{ data, fetching }] = urql.useQuery({ query: PREFS_QUERY });
  const [, executeMutation] = urql.useMutation(UPDATE_MUTATION);
  const prefs: PrefRow[] = useMemo(
    () => data?.myNotificationPreferences ?? [],
    [data]
  );
  const whatsappSetup = prefs.some((p) => p.channel === 'whatsapp');

  const isEnabled = useCallback(
    (type: string, ch: Channel) =>
      prefs.find((p) => p.notificationType === type && p.channel === ch)
        ?.enabled ?? false,
    [prefs]
  );

  const toggle = useCallback(
    (type: string, ch: Channel, current: boolean) => {
      void executeMutation({
        input: { notificationType: type, channel: ch, enabled: !current },
      });
    },
    [executeMutation]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-6 w-6" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Notification Preferences</h1>
      </div>
      {fetching ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm"
            role="grid"
            aria-label="Notification preferences"
          >
            <thead>
              <tr>
                <th className="text-left py-2 pr-4 font-medium">
                  Notification
                </th>
                {CHANNELS.map((ch) => (
                  <th key={ch} className="text-center py-2 px-2 font-medium">
                    {CHANNEL_LABELS[ch]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((cat) => (
                <React.Fragment key={cat.name}>
                  <tr>
                    <td
                      colSpan={6}
                      className="pt-4 pb-1 font-semibold text-muted-foreground"
                    >
                      {cat.name}
                    </td>
                  </tr>
                  {cat.types.map((t) => (
                    <tr key={t.key} className="border-b">
                      <td className="py-2 pr-4">{t.label}</td>
                      {CHANNELS.map((ch) => (
                        <td key={ch} className="text-center py-2 px-2">
                          {ch === 'whatsapp' && !whatsappSetup ? (
                            <Link
                              to="/settings/whatsapp"
                              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                              Set up
                            </Link>
                          ) : (
                            <>
                              <Label
                                className="sr-only"
                                htmlFor={`${t.key}-${ch}`}
                              >{`${t.label} ${CHANNEL_LABELS[ch]}`}</Label>
                              <Switch
                                id={`${t.key}-${ch}`}
                                checked={isEnabled(t.key, ch)}
                                onCheckedChange={() =>
                                  toggle(t.key, ch, isEnabled(t.key, ch))
                                }
                              />
                            </>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
