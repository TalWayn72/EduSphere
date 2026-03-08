import { gql } from 'urql';

export const MY_CERTIFICATES_QUERY = gql`
  query MyCertificates {
    myCertificates {
      id
      courseId
      issuedAt
      verificationCode
      pdfUrl
      metadata
    }
  }
`;

export const CERTIFICATE_DOWNLOAD_URL_QUERY = gql`
  query CertificateDownloadUrl($certId: ID!) {
    certificateDownloadUrl(certId: $certId)
  }
`;
