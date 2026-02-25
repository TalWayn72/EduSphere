import { gql } from 'urql';

export const MY_PORTAL_QUERY = gql`
  query MyPortal {
    myPortal {
      id
      title
      published
      updatedAt
      blocks {
        id
        type
        order
        config
      }
    }
  }
`;

export const PUBLIC_PORTAL_QUERY = gql`
  query PublicPortal {
    publicPortal {
      id
      title
      published
      updatedAt
      blocks {
        id
        type
        order
        config
      }
    }
  }
`;

export const SAVE_PORTAL_LAYOUT_MUTATION = gql`
  mutation SavePortalLayout($title: String!, $blocksJson: String!) {
    savePortalLayout(title: $title, blocksJson: $blocksJson) {
      id
      title
      published
      updatedAt
      blocks {
        id
        type
        order
        config
      }
    }
  }
`;

export const PUBLISH_PORTAL_MUTATION = gql`
  mutation PublishPortal {
    publishPortal
  }
`;

export const UNPUBLISH_PORTAL_MUTATION = gql`
  mutation UnpublishPortal {
    unpublishPortal
  }
`;
