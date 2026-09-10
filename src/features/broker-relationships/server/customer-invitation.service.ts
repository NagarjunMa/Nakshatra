import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { workspaceRefSchema } from "@/features/security/public-reference";
import {
  brokerdeskCustomersSchema,
  claimedCustomerInvitationSchema,
  createdCustomerInvitationSchema,
  customerBrokerRelationshipsSchema,
} from "./customer-invitation.contract";
import { CustomerInvitationRepository } from "./customer-invitation.repository";

export class CustomerInvitationError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) { super(message); }
}

export async function createCustomerInvitation(supabase: SupabaseClient, input: {
  workspaceRef: string;
  emailHash: string;
  emailHint: string;
  tokenHash: string;
  idempotencyKey: string;
}) {
  if (!workspaceRefSchema.safeParse(input.workspaceRef).success) {
    throw new CustomerInvitationError("Workspace unavailable.", "BROKERDESK_WORKSPACE_UNAVAILABLE", 404);
  }
  const { data, error } = await new CustomerInvitationRepository(supabase).create(input);
  const parsed = createdCustomerInvitationSchema.safeParse(data);
  if (error?.code === "42501") {
    throw new CustomerInvitationError("Workspace unavailable.", "BROKERDESK_WORKSPACE_UNAVAILABLE", 404);
  }
  if (error?.code === "22023") {
    throw new CustomerInvitationError("Check the invitation and try again.", "BROKERDESK_CUSTOMER_INVITATION_INVALID", 400);
  }
  if (error || !parsed.success) {
    throw new CustomerInvitationError("The invitation could not be created.", "BROKERDESK_CUSTOMER_INVITATION_UNAVAILABLE", 503);
  }
  return parsed.data;
}

export async function claimCustomerInvitation(supabase: SupabaseClient, tokenHash: string) {
  const { data, error } = await new CustomerInvitationRepository(supabase).claim(tokenHash);
  const parsed = claimedCustomerInvitationSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new CustomerInvitationError("The invitation is unavailable.", "BROKERDESK_CUSTOMER_INVITATION_UNAVAILABLE", 403);
  }
  return parsed.data;
}

export async function resolveBrokerdeskCustomers(supabase: SupabaseClient, workspaceRef: string) {
  if (!workspaceRefSchema.safeParse(workspaceRef).success) return { available: false } as const;
  const { data, error } = await new CustomerInvitationRepository(supabase).brokerdeskCustomers(workspaceRef);
  const parsed = brokerdeskCustomersSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new CustomerInvitationError("Customers are temporarily unavailable.", "BROKERDESK_CUSTOMERS_UNAVAILABLE", 503);
  }
  return parsed.data;
}

export async function resolveCustomerBrokerRelationships(supabase: SupabaseClient) {
  const { data, error } = await new CustomerInvitationRepository(supabase).customerRelationships();
  const parsed = customerBrokerRelationshipsSchema.safeParse(data);
  if (error || !parsed.success) {
    throw new CustomerInvitationError("Broker relationships are temporarily unavailable.", "CUSTOMER_BROKERS_UNAVAILABLE", 503);
  }
  return parsed.data;
}
