import type { Metadata } from "next";
import Link from "next/link";
import { StatTile } from "@/components/stat-tile";
import { requireUser } from "@/lib/auth";
import { parsePeriod, PERIOD_LABELS, PERIODS, type Period } from "@/lib/time";
import { getCompanyTotals, getDepartmentLeaderboard, getLeaderboard } from "@/lib/workouts";

export const metadata: Metadata = { title: "Bảng xếp hạng" };

type View = "people" | "teams";
const MEDALS = ["🥇", "🥈", "🥉"];

export default async function LeaderboardPage({ searchParams }: PageProps<"/leaderboard">) {
  const user = await requireUser();
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const view: View = sp.view === "teams" ? "teams" : "people";
  const totals = getCompanyTotals(period);

  const href = (p: Period, v: View) => `/leaderboard?period=${p}&view=${v}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Bảng xếp hạng</h1>
        <div className="flex flex-wrap gap-2">
          <Segmented
            items={PERIODS.map((p) => ({ href: href(p, view), label: PERIOD_LABELS[p], active: p === period }))}
          />
          <Segmented
            items={[
              { href: href(period, "people"), label: "Cá nhân", active: view === "people" },
              { href: href(period, "teams"), label: "Phòng ban", active: view === "teams" },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Tổng rep" value={totals.reps} />
        <StatTile label="Người tham gia" value={totals.participants} />
        <StatTile label="Buổi tập" value={totals.sessions} />
      </div>

      {view === "people" ? <People period={period} userId={user.id} /> : <Teams period={period} myDepartment={user.department} />}
    </div>
  );
}

function Segmented({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface p-1">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${i.active ? "bg-accent text-accent-ink" : "text-ink-2 hover:text-ink"}`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="card p-10 text-center">
      <p className="font-semibold">Chưa có dữ liệu trong khoảng thời gian này</p>
      <Link href="/workout" className="btn-primary mt-4">Tập ngay</Link>
    </div>
  );
}

function People({ period, userId }: { period: Period; userId: number }) {
  const rows = getLeaderboard(period);
  if (rows.length === 0) return <Empty />;
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="w-16 px-4 py-3 text-center">Hạng</th>
            <th className="px-4 py-3">Thành viên</th>
            <th className="hidden px-4 py-3 sm:table-cell">Phòng ban</th>
            <th className="hidden px-4 py-3 text-right sm:table-cell">Buổi</th>
            <th className="px-4 py-3 text-right">Rep</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            <tr key={r.userId} className={r.userId === userId ? "bg-accent-soft" : ""}>
              <td className="px-4 py-3 text-center text-base font-bold tabular-nums">{MEDALS[r.rank - 1] ?? r.rank}</td>
              <td className="px-4 py-3 font-medium">
                {r.name}
                {r.userId === userId && <span className="ml-2 text-xs font-semibold text-accent">(bạn)</span>}
                <span className="block text-xs text-muted sm:hidden">{r.department}</span>
              </td>
              <td className="hidden px-4 py-3 text-ink-2 sm:table-cell">{r.department || "—"}</td>
              <td className="hidden px-4 py-3 text-right tabular-nums text-ink-2 sm:table-cell">{r.sessions}</td>
              <td className="px-4 py-3 text-right text-base font-bold tabular-nums">{r.reps}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Teams({ period, myDepartment }: { period: Period; myDepartment: string }) {
  const rows = getDepartmentLeaderboard(period).filter((r) => r.reps > 0);
  if (rows.length === 0) return <Empty />;
  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="w-16 px-4 py-3 text-center">Hạng</th>
            <th className="px-4 py-3">Phòng ban</th>
            <th className="px-4 py-3 text-right">Tham gia</th>
            <th className="hidden px-4 py-3 text-right sm:table-cell">Rep / người</th>
            <th className="px-4 py-3 text-right">Tổng rep</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={r.department} className={r.department === myDepartment ? "bg-accent-soft" : ""}>
              <td className="px-4 py-3 text-center text-base font-bold tabular-nums">{MEDALS[i] ?? i + 1}</td>
              <td className="px-4 py-3 font-medium">{r.department}</td>
              <td className="px-4 py-3 text-right tabular-nums text-ink-2">
                {r.participants}/{r.members}
              </td>
              <td className="hidden px-4 py-3 text-right tabular-nums text-ink-2 sm:table-cell">
                {Math.round(r.reps / Math.max(1, r.members))}
              </td>
              <td className="px-4 py-3 text-right text-base font-bold tabular-nums">{r.reps}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-4 py-3 text-xs text-muted">
        Rep / người tính trên tổng số thành viên của phòng ban, để phòng ban nhỏ và lớn so sánh công bằng.
      </p>
    </div>
  );
}
