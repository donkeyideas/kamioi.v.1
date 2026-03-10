import { useAuth } from '@/hooks/useAuth'
import { useCallback } from 'react'

export const PERMISSION_KEYS = [
  'can_view_users',
  'can_edit_users',
  'can_view_transactions',
  'can_edit_transactions',
  'can_access_llm',
  'can_manage_system',
  'can_view_analytics',
  'can_manage_advertisements',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

/**
 * Check if a permissions object grants a specific permission.
 *   - NULL permissions = super admin = everything granted
 *   - Missing key = granted (default true)
 *   - Explicit false = denied
 */
export function hasPermission(
  permissions: Record<string, boolean> | null,
  key: PermissionKey,
): boolean {
  if (permissions === null) return true
  return permissions[key] !== false
}

export function isSuperAdmin(permissions: Record<string, boolean> | null): boolean {
  return permissions === null
}

/** Returns all permission keys with default true values. */
export function defaultPermissions(): Record<string, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true]))
}

/** Hook for the current logged-in admin user's permissions. */
export function useAdminPermissions() {
  const { profile } = useAuth()
  const permissions = profile?.permissions ?? null

  const can = useCallback(
    (key: PermissionKey) => hasPermission(permissions, key),
    [permissions],
  )

  return {
    permissions,
    can,
    isSuperAdmin: isSuperAdmin(permissions),
    isAdmin: profile?.account_type === 'admin',
  }
}
