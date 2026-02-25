import { gql } from 'urql';

export const ADMIN_ANNOUNCEMENTS_QUERY = gql`
  query AdminAnnouncements($limit: Int, $offset: Int) {
    adminAnnouncements(limit: $limit, offset: $offset) {
      announcements {
        id
        title
        body
        priority
        targetAudience
        isActive
        publishAt
        expiresAt
        createdAt
      }
      total
    }
  }
`;

export const CREATE_ANNOUNCEMENT_MUTATION = gql`
  mutation CreateAnnouncement($input: CreateAnnouncementInput!) {
    createAnnouncement(input: $input) {
      id
      title
      body
      priority
      targetAudience
      isActive
      publishAt
      expiresAt
      createdAt
    }
  }
`;

export const UPDATE_ANNOUNCEMENT_MUTATION = gql`
  mutation UpdateAnnouncement($id: ID!, $input: UpdateAnnouncementInput!) {
    updateAnnouncement(id: $id, input: $input) {
      id
      title
      body
      priority
      targetAudience
      isActive
      publishAt
      expiresAt
      createdAt
    }
  }
`;

export const DELETE_ANNOUNCEMENT_MUTATION = gql`
  mutation DeleteAnnouncement($id: ID!) {
    deleteAnnouncement(id: $id)
  }
`;

export const PUBLISH_ANNOUNCEMENT_MUTATION = gql`
  mutation PublishAnnouncement($id: ID!) {
    publishAnnouncement(id: $id) {
      id
      isActive
    }
  }
`;
