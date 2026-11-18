"use client";

import type { ReactNode } from "react";
import { AdminApp } from "@gitwork/admin-shell";
import config from "../../admin.config";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminApp config={config}>{children}</AdminApp>;
}
