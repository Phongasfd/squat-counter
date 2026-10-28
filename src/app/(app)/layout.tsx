import Link from "next/link";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";
import { Nav } from "./nav";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/dashboard" className="text-lg">
            <Logo />
          </Link>
          <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
            <Nav isAdmin={user.role === "admin"} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/profile" className="btn-ghost h-9 px-2" title="Hồ sơ">
              <span className="grid size-7 place-items-center rounded-full bg-surface-2 text-xs font-bold text-ink">
                {initials(user.name)}
              </span>
              <span className="hidden max-w-32 truncate md:inline">{user.name}</span>
            </Link>
            <form action={logout}>
              <button className="btn-ghost h-9 px-3" type="submit">Đăng xuất</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}
