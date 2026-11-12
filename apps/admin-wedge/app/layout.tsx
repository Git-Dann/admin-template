import type { ReactNode } from "react";
import { AdminRootLayout, adminMetadata } from "@gitwork/admin-shell/next";
import config from "../admin.config";
import "./globals.css";

export const metadata = adminMetadata(config.brand);

export default function RootLayout({ children }: { children: ReactNode }) {
  return <AdminRootLayout brand={config.brand}>{children}</AdminRootLayout>;
}
