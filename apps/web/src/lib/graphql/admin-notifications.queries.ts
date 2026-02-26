import { gql } from 'urql';

export const ADMIN_NOTIFICATION_TEMPLATES_QUERY = gql`
  query AdminNotificationTemplates {
    adminNotificationTemplates {
      id
      key
      name
      subject
      bodyHtml
      variables
      isActive
      updatedAt
    }
  }
`;

export const UPDATE_NOTIFICATION_TEMPLATE_MUTATION = gql`
  mutation UpdateNotificationTemplate(
    $id: ID!
    $input: UpdateNotificationTemplateInput!
  ) {
    updateNotificationTemplate(id: $id, input: $input) {
      id
      key
      name
      subject
      bodyHtml
      variables
      isActive
      updatedAt
    }
  }
`;

export const RESET_NOTIFICATION_TEMPLATE_MUTATION = gql`
  mutation ResetNotificationTemplate($id: ID!) {
    resetNotificationTemplate(id: $id) {
      id
      key
      name
      subject
      bodyHtml
      variables
      isActive
      updatedAt
    }
  }
`;

export interface NotificationTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
  isActive: boolean;
  updatedAt: string;
}

export interface UpdateNotificationTemplateInput {
  subject?: string;
  bodyHtml?: string;
  isActive?: boolean;
}
