"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";
import { mainNav } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[rgb(var(--border))] bg-[rgb(var(--bg-elevated))] p-4 md:flex md:flex-col">
      <div className="mb-6 px-2 text-lg font-semibold">Soulèvement</div>
      <nav className="flex flex-col gap-1">
        {mainNav.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} className="relative">
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-brand-500/10"
                  transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                />
              )}
              <span
                className={clsx(
                  "relative z-10 flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  active
                    ? "font-medium text-brand-600 dark:text-brand-500"
                    : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text))]"
                )}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
