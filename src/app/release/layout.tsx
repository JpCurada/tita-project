import { AppShell } from "@/components/AppShell";

export default function ReleaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
