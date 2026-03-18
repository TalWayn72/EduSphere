import { gql } from 'urql';

export const MY_NOTIFICATION_PREFERENCES_QUERY = gql`
  query MyNotificationPreferences {
    myNotificationPreferences {
      id
      notificationType
      channel
      enabled
    }
  }
`;

export const UPDATE_NOTIFICATION_PREFERENCE_MUTATION = gql`
  mutation UpdateNotificationPreference(
    $input: UpdateNotificationPreferenceInput!
  ) {
    updateNotificationPreference(input: $input) {
      id
      notificationType
      channel
      enabled
    }
  }
`;

export const MY_NOTIFICATION_HISTORY_QUERY = gql`
  query MyNotificationHistory(
    $first: Int
    $after: String
    $types: [NotificationType!]
    $channels: [NotificationChannel!]
  ) {
    myNotificationHistory(
      first: $first
      after: $after
      types: $types
      channels: $channels
    ) {
      edges {
        cursor
        node {
          id
          notificationType
          channel
          title
          body
          status
          sentAt
          deliveredAt
          readAt
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const NOTIFICATION_DELIVERY_ANALYTICS_QUERY = gql`
  query NotificationDeliveryAnalytics(
    $startDate: DateTime!
    $endDate: DateTime!
  ) {
    notificationDeliveryAnalytics(startDate: $startDate, endDate: $endDate) {
      totalSent
      totalDelivered
      totalFailed
      byChannel {
        channel
        sent
        delivered
        failed
      }
      byType {
        notificationType
        sent
        delivered
        failed
      }
    }
  }
`;

export const MARK_NOTIFICATION_READ_MUTATION = gql`
  mutation MarkNotificationDeliveryRead($id: ID!) {
    markNotificationDeliveryRead(id: $id) {
      id
      readAt
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ_MUTATION = gql`
  mutation MarkAllNotificationDeliveriesRead {
    markAllNotificationDeliveriesRead
  }
`;

export interface NotificationPreference {
  id: string;
  notificationType: string;
  channel: string;
  enabled: boolean;
}

export interface NotificationDelivery {
  id: string;
  notificationType: string;
  channel: string;
  title: string;
  body: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}
