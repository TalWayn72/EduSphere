import { gql } from 'urql';

export const CRM_CONNECTION_QUERY = gql`
  query CrmConnection {
    crmConnection {
      id
      provider
      instanceUrl
      isActive
      createdAt
    }
  }
`;

export const CRM_SYNC_LOG_QUERY = gql`
  query CrmSyncLog($limit: Int) {
    crmSyncLog(limit: $limit) {
      id
      operation
      externalId
      status
      errorMessage
      createdAt
    }
  }
`;

export const DISCONNECT_CRM_MUTATION = gql`
  mutation DisconnectCrm {
    disconnectCrm
  }
`;
