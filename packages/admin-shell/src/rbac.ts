/**
 * Role-based access control with "own scope".
 *
 * Grants are strings on a role:
 *   "users.read"          read all users
 *   "content.*"           every content permission
 *   "*"                   everything (owners)
 *   "groups.manage:own"   manage only groups the user owns
 *
 *   can(user, "groups.manage")                         → true if granted at any scope
 *   can(user, "groups.manage", { ownerId: group.ownerId }) → checks own scope
 *   scopeOf(user, "groups.manage")                     → "all" | "own" | "none" (for list filtering)
 */
import type { RoleDefinition } from "@gitwork/data";

export interface RbacSubject {
  id: string;
  /** Resolved grants for the user's role. */
  permissions: readonly string[];
  /** Resource IDs the user owns, as an alternative to passing ownerId. */
  owns?: readonly string[];
}

export interface Scope {
  /** Owner of the resource being acted on. */
  ownerId?: string;
  /** ID of the resource, matched against `subject.owns`. */
  resourceId?: string;
}

export type ScopeLevel = "all" | "own" | "none";

export interface PermissionDefinition {
  id: string;
  label: string;
  description?: string;
  /** Whether "own" scope makes sense for this permission. */
  ownable?: boolean;
}

function parse(grant: string): { pattern: string; own: boolean } {
  const [pattern, scope] = grant.split(":");
  return { pattern: pattern!, own: scope === "own" };
}

function matches(pattern: string, permission: string): boolean {
  if (pattern === "*" || pattern === permission) return true;
  const p = pattern.split(".");
  const q = permission.split(".");
  for (let i = 0; i < p.length; i++) {
    if (p[i] === "*") return true;
    if (p[i] !== q[i]) return false;
  }
  return p.length === q.length;
}

export function scopeOf(subject: RbacSubject | null | undefined, permission: string): ScopeLevel {
  if (!subject) return "none";
  let level: ScopeLevel = "none";
  for (const grant of subject.permissions) {
    const { pattern, own } = parse(grant);
    if (!matches(pattern, permission)) continue;
    if (!own) return "all";
    level = "own";
  }
  return level;
}

export function can(subject: RbacSubject | null | undefined, permission: string, scope?: Scope): boolean {
  const level = scopeOf(subject, permission);
  if (level === "all") return true;
  if (level === "none" || !subject) return false;
  if (!scope) return true; // granted for at least the user's own resources
  if (scope.ownerId !== undefined) return scope.ownerId === subject.id;
  if (scope.resourceId !== undefined) return subject.owns?.includes(scope.resourceId) ?? false;
  return false;
}

/** Resolve a user's grants from the configured roles. */
export function permissionsFor(roleId: string, roles: readonly RoleDefinition[]): string[] {
  return roles.find((r) => r.id === roleId)?.permissions ?? [];
}

/** Set one permission's level on a role (used by the permission matrix). */
export function setScope(role: RoleDefinition, permission: string, level: ScopeLevel): RoleDefinition {
  const kept = role.permissions.filter((g) => parse(g).pattern !== permission);
  if (level === "all") kept.push(permission);
  if (level === "own") kept.push(`${permission}:own`);
  return { ...role, permissions: kept };
}
