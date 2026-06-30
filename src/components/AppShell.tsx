import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, FileText, Home, Settings } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({
  title,
  children,
  back,
  right,
}: {
  title: string;
  children: ReactNode;
  back?: boolean;
  right?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur">
        {back ? (
          <button
            onClick={() => router.history.back()}
            className="rounded-md p-2 hover:bg-accent"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
        <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
        {right}
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-3 border-t border-border bg-card">
        <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Home" />
        <NavItem to="/documents" icon={<FileText className="h-5 w-5" />} label="Docs" />
        <NavItem to="/settings" icon={<Settings className="h-5 w-5" />} label="Settings" />
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground [&.active]:text-primary"
      activeProps={{ className: "active" }}
      activeOptions={{ exact: to === "/" }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
