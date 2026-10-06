/** References only: the assistant API resolves authorized deployment details server-side. */
export type AssistantContext = { type: "deployment"; deploymentId: string; serviceName: string };