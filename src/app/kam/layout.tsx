import { KamShell } from "@/features/kam/kam-shell"

export default function KamLayout({ children }: LayoutProps<"/kam">) {
  return <KamShell>{children}</KamShell>
}
