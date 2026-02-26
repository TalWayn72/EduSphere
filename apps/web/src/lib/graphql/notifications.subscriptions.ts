import { gql } from 'urql';

/**
 * Real-time notification subscription.
 * Streams Notification objects for the given userId via GraphQL WebSocket.
 *
 * Security: The server enforces that JWT userId == argument userId.
 */
export const NOTIFICATION_RECEIVED_SUBSCRIPTION = gql`
  subscription NotificationReceived($userId: ID!) {
    notificationReceived(userId: $userId) {
      id
      type
      title
      body
      payload
      readAt
      createdAt
    }
  }
`;
