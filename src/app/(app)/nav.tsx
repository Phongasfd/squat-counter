"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/workout", label: "Tập luyện" },
  { href: "/leaderboard", label: "Bảng xếp hạng" },
  { href: "/history", label: "Lịch sử" },
] as const;

export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Quản trị" }] : LINKS;
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
