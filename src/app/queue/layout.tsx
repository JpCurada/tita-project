import { AppShell } from "@/components/AppShell";

export default function QueueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
