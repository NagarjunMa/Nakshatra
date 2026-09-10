import { z } from "zod/v4";

const httpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);

export const brokerdeskEndpointInventoryItemSchema = z.object({
  id: z.string().regex(/^brokerdesk\.[a-z0-9.]+$/),
  status: z.enum(["planned", "active", "deprecated"]),
  method: httpMethodSchema,
  path: z.string().startsWith("/api/v1/"),
  owner: z.string().min(1),
  audience: z.enum(["broker_member", "customer", "worker"]),
  authentication: z.enum(["live_session", "worker_identity", "public_same_origin"]),
  capability: z.string().min(1).nullable(),
  resourceScope: z.enum([
    "workspace",
    "workspace_member",
    "assigned_customer",
    "introduction_route",
    "customer_case",
    "job",
  ]),
  inputSchema: z.string().min(1),
  outputSchema: z.string().min(1),
  dataClass: z.enum(["internal", "confidential", "restricted"]),
  rateLimitAction: z.string().min(1),
  idempotency: z.enum(["not_applicable", "required"]),
  stepUp: z.enum(["not_required", "required"]),
  auditEvent: z.string().min(1).nullable(),
}).strict();

export const brokerdeskEndpointInventorySchema = z.object({
  version: z.literal(1),
  endpoints: z.array(brokerdeskEndpointInventoryItemSchema).min(1),
}).strict().superRefine((inventory, context) => {
  const ids = new Set<string>();
  const routes = new Set<string>();

  inventory.endpoints.forEach((endpoint, index) => {
    if (ids.has(endpoint.id)) {
      context.addIssue({ code: "custom", path: ["endpoints", index, "id"], message: "Duplicate endpoint id" });
    }
    ids.add(endpoint.id);

    const routeKey = `${endpoint.method} ${endpoint.path}`;
    if (routes.has(routeKey)) {
      context.addIssue({ code: "custom", path: ["endpoints", index, "path"], message: "Duplicate method and path" });
    }
    routes.add(routeKey);
  });
});
