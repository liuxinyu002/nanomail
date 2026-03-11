export { createEmailRoutes } from './email.routes'
export { createTodoRoutes } from './todo.routes'

// Re-export types
export type {
  PaginationQuery,
  EmailsQuery,
  EmailsResponse,
  ProcessEmailsRequest,
  ProcessEmailsResponse,
} from './email.routes'

export type { TodosQuery, TodosResponse } from './todo.routes'