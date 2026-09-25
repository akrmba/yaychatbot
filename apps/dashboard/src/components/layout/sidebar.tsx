"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  CreditCard,
  Bot,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/widgets", label: "Widgets", icon: Bot },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/settings/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen border-r bg-card px-3 py-4">
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
          Y
        </div>
        <span className="font-semibold text-lg">YayChatbot</span>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {active && <ChevronRight className="ml-auto h-3 w-3" />}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleSignOut}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mt-4"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </aside>
  );
}
