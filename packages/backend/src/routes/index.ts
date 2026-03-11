export { createEmailRoutes } from './email.routes'
export { createTodoRoutes } from './todo.routes'
export { createAgentRoutes } from './agent.routes'

// Re-export types
export type {
  PaginationQuery,
  EmailsQuery,
  EmailsResponse,
  ProcessEmailsRequest,
  ProcessEmailsResponse,
} from './email.routes'

export type { TodosQuery, TodosResponse } from './todo.routes'

export type { DraftRequest, ProcessEmailsRequest as AgentProcessEmailsRequest, AgentRoutesDeps } from './agent.routes'