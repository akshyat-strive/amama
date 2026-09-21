import { InternalShell } from "@/features/internal/internal-shell"

export default function InternalConsoleLayout({ children }: LayoutProps<"/internal">) {
  return <InternalShell>{children}</InternalShell>
}
