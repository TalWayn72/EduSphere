/**
 * Shared types for org-provisioning services.
 */
export interface CreateOrgInput {
  name: string;
  slug: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  idempotencyKey: string;
}

export interface ProvisioningResult {
  id: string;
  name: string;
  slug: string;
  plan: string;
  provisioningStatus: string;
  trialEndsAt: Date | null;
  createdAt: Date;
}

export interface ProvisioningSteps {
  step1_slug_validated?: boolean;
  step2_tenant_created?: boolean;
  step3_keycloak_group?: { groupId: string; completed: boolean };
  step4_admin_user?: { userId: string; completed: boolean };
  step5_minio_bucket?: { completed: boolean };
  step5b_subdomain?: { url: string; completed: boolean };
  step6_checklist?: { completed: boolean };
  step7_nats_event?: { completed: boolean };
  step8_welcome_email?: { completed: boolean };
}
