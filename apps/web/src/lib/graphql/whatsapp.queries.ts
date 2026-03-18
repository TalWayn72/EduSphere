import { gql } from 'urql';

export const REGISTER_WHATSAPP_MUTATION = gql`
  mutation RegisterWhatsApp($phoneNumber: String!, $countryCode: String!) {
    registerWhatsApp(phoneNumber: $phoneNumber, countryCode: $countryCode) {
      success
      message
    }
  }
`;

export const VERIFY_WHATSAPP_MUTATION = gql`
  mutation VerifyWhatsApp($code: String!) {
    verifyWhatsApp(code: $code) {
      verified
      message
    }
  }
`;

export interface WhatsAppRegistrationResult {
  success: boolean;
  message: string;
}

export interface WhatsAppVerificationResult {
  verified: boolean;
  message: string;
}
