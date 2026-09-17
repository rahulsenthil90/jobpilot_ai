"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  Bell,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  Inbox,
  Globe2,
  LayoutDashboard,
  Menu,
  Moon,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Applications", to: "/applications", icon: BriefcaseBusiness },
  { label: "Resume & Details", to: "/resume", icon: FileText },
  { label: "Education", to: "/education", icon: GraduationCap },
  { label: "Certifications", to: "/certifications", icon: Award },
  { label: "AI Assistance", to: "/assistance", icon: Sparkles },
  { label: "Job Platforms", to: "/job-platforms", icon: Globe2 },
  { label: "Review Queue", to: "/review-queue", icon: Inbox },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const saved = window.localStorage.getItem("jobpilot-theme");
    setDark(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("jobpilot-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
          <aside className="border-b border-border bg-card/70 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 lg:p-6">
              <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
                <div className="grid size-9 shrink-0 place-items-center rounded-sm bg-primary font-display font-bold text-primary-foreground">J</div>
                <span className="truncate font-display text-lg font-semibold">JobPilot AI</span>
              </Link>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((open) => !open)}>
                {menuOpen ? <X /> : <Menu />}
              </Button>
            </div>

            <div className={`${menuOpen ? "block" : "hidden"} px-3 pb-4 lg:flex lg:h-[calc(100vh-84px)] lg:flex-col`}>
              <nav aria-label="Main navigation" className="space-y-1">
                {navItems.map(({ label, to, icon: Icon }) => {
                  const active = pathname?.startsWith(to);
                  return (
                    <Button key={to} variant="ghost" asChild className={`w-full justify-start px-3 py-2.5 ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>
                      <Link href={to} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined}>
                        <Icon />
                        <span className="truncate">{label}</span>
                      </Link>
                    </Button>
                  );
                })}
              </nav>
              <div className="mt-6 border-t border-border pt-5 lg:mt-auto space-y-2">
                <label className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md p-2 hover:bg-muted">
                  <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    {dark ? <Moon className="size-4 shrink-0" /> : <Sun className="size-4 shrink-0" />}
                    <span>{dark ? "Dark" : "Light"} appearance</span>
                  </span>
                  <Switch checked={dark} onCheckedChange={setDark} aria-label="Toggle dark appearance" />
                </label>
                <Button variant="ghost" onClick={signOut} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                  Logout
                </Button>
              </div>
            </div>
          </aside>
          <main className="w-full min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export function WorkspaceHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <Button variant="ghost" size="icon" aria-label="Notifications"><Bell /></Button>
        <div className="grid size-10 place-items-center rounded-full bg-secondary font-display text-sm font-semibold text-secondary-foreground">ME</div>
      </div>
    </header>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-md border border-border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg">
      {children}
    </div>
  );
}
