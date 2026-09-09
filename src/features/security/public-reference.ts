import { z } from "zod/v4";

const RANDOM_REFERENCE_PART = "[0-9a-f]{32}";

function referenceSchema<const Prefix extends string>(prefix: Prefix) {
  return z
    .string()
    .regex(
      new RegExp(`^${prefix}_${RANDOM_REFERENCE_PART}$`),
      `Invalid ${prefix} reference`
    );
}

export const workspaceRefSchema = referenceSchema("wrk").brand<"WorkspaceRef">();
export const brokerCustomerRelationshipRefSchema = referenceSchema("bcr")
  .brand<"BrokerCustomerRelationshipRef">();
export const brokerIntroductionRouteRefSchema = referenceSchema("bir")
  .brand<"BrokerIntroductionRouteRef">();
export const customerIntroductionCaseRefSchema = referenceSchema("inc")
  .brand<"CustomerIntroductionCaseRef">();
export const taskRefSchema = referenceSchema("tsk").brand<"TaskRef">();
export const importRefSchema = referenceSchema("imp").brand<"ImportRef">();
export const invitationRefSchema = referenceSchema("inv").brand<"InvitationRef">();

export type WorkspaceRef = z.infer<typeof workspaceRefSchema>;
export type BrokerCustomerRelationshipRef = z.infer<
  typeof brokerCustomerRelationshipRefSchema
>;
export type BrokerIntroductionRouteRef = z.infer<
  typeof brokerIntroductionRouteRefSchema
>;
export type CustomerIntroductionCaseRef = z.infer<
  typeof customerIntroductionCaseRefSchema
>;
export type TaskRef = z.infer<typeof taskRefSchema>;
export type ImportRef = z.infer<typeof importRefSchema>;
export type InvitationRef = z.infer<typeof invitationRefSchema>;
