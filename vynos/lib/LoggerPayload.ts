export const JSONRPC = '2.0'

export interface LoggerPayload {
  message?: string
  stack?: string
  type: string
}

export default LoggerPayload
