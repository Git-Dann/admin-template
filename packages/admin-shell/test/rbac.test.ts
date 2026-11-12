import { describe, expect, it } from "vitest";
import { can, permissionsFor, scopeOf, setScope } from "../src/rbac";

const roles = [
  { id: "owner", label: "Owner", permissions: ["*"] },
  { id: "admin", label: "Admin", permissions: ["users.*", "groups.manage", "reports.read"] },
  { id: "creator", label: "Creator", permissions: ["groups.manage:own", "content.read"] },
  { id: "viewer", label: "Viewer", permissions: ["reports.read"] },
];
const subject = (id: string, roleId: string, owns?: string[]) => ({ id, permissions: permissionsFor(roleId, roles), owns });

describe("can()", () => {
  it("owners can do everything", () => {
    expect(can(subject("u1", "owner"), "themes.publish")).toBe(true);
  });

  it("matches wildcards by segment", () => {
    const admin = subject("u2", "admin");
    expect(can(admin, "users.manage")).toBe(true);
    expect(can(admin, "users.roles.change")).toBe(true);
    expect(can(admin, "themes.publish")).toBe(false);
  });

  it("own scope: creators manage only their own groups", () => {
    const creator = subject("c1", "creator", ["g-7"]);
    expect(can(creator, "groups.manage")).toBe(true); // has it for something
    expect(can(creator, "groups.manage", { ownerId: "c1" })).toBe(true);
    expect(can(creator, "groups.manage", { ownerId: "someone-else" })).toBe(false);
    expect(can(creator, "groups.manage", { resourceId: "g-7" })).toBe(true);
    expect(can(creator, "groups.manage", { resourceId: "g-8" })).toBe(false);
    expect(scopeOf(creator, "groups.manage")).toBe("own");
  });

  it("an all-scope grant beats an own-scope one", () => {
    const both = { id: "x", permissions: ["groups.manage:own", "groups.manage"] };
    expect(can(both, "groups.manage", { ownerId: "y" })).toBe(true);
  });

  it("denies when signed out or not granted", () => {
    expect(can(null, "reports.read")).toBe(false);
    expect(can(subject("v", "viewer"), "users.read")).toBe(false);
  });

  it("setScope rewrites a role's grant for the matrix", () => {
    const creator = roles[2]!;
    expect(setScope(creator, "groups.manage", "all").permissions).toContain("groups.manage");
    expect(setScope(creator, "groups.manage", "none").permissions).not.toContain("groups.manage:own");
    expect(setScope(roles[3]!, "users.read", "own").permissions).toContain("users.read:own");
  });
});
