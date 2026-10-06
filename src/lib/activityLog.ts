import { supabase } from './supabase'

export const LOG_ACTIONS = ['Added', 'Edited', 'Deleted'] as const
export type LogAction = (typeof LOG_ACTIONS)[number]

export const LOG_MODULES = ['Destinations', 'Transportation', 'Categories', 'Users'] as const
export type LogModule = (typeof LOG_MODULES)[number]

/** Log entries are never changed after they are written, so every field is read-only. */
export interface LogEntry {
  readonly id: number
  readonly admin: string
  readonly action: LogAction
  readonly module: LogModule
  readonly description: string
  /** ISO date-time of the action. */
  readonly timestamp: string
}

interface LogRow {
  log_id: number
  admin_name: string
  action: LogAction
  module: LogModule
  description: string
  created_at: string
}

/** True when the activity_log table has not been created in the database yet (the SQL was not run). */
export function isActivityLogMissing(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  return code === 'PGRST205' || code === '42P01'
}

/** The newest entries first. The table is filled by database triggers; the dashboard can only read it. */
export async function fetchActivityLog(limit = 1000): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('log_id, admin_name, action, module, description, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error

  return (data as LogRow[]).map((row) => ({
    id: row.log_id,
    admin: row.admin_name,
    action: row.action,
    module: row.module,
    description: row.description,
    timestamp: row.created_at,
  }))
}
