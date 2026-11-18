"use client";

import { AdminLogin } from "@gitwork/admin-shell";
import config from "../../admin.config";

export default function LoginPage() {
  return <AdminLogin config={config} />;
}
