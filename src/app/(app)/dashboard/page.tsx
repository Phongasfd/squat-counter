import type { Metadata } from "next";
import Link from "next/link";
import { DailyBars } from "@/components/daily-bars";
import { StatTile } from "@/components/stat-tile";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatDuration, localDateKey } from "@/lib/time";
import { getCompanyTotals, getLeaderboard, getUserSummary, listWorkouts } from "@/lib/workouts";

export const metadata: Metadata = { title: "Tổng quan" };

export default async function DashboardPage() {
  const user = await requireUser();
  const summary = getUserSummary(user.id);
  const recent = listWorkouts(user.id, 5).items;
  const weekBoard = getLeaderboard("week");
  const myRank = weekBoard.find((e) => e.userId === user.id)?.rank;
  const company = getCompanyTotals("week");
  const firstName = user.name.trim().split(/\s+/).at(-1);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Chào {firstName} 👋</h1>
          <p className="mt-1 text-ink-2">
            {summary.today > 0
              ? `Hôm nay bạn đã squat ${summary.today} rep. Tiếp tục nào!`
              : "Hôm nay bạn chưa tập. Vài phút squat thôi!"}
          </p>
        </div>
        <Link href="/workout" className="btn-primary h-12 px-6 text-base">
          Bắt đầu tập
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Hôm nay" value={summary.today} hint="rep" />
        <StatTile label="Tuần này" value={summary.week} hint={myRank ? `Hạng #${myRank} trong công ty` : "Chưa có trên bảng xếp hạng"} />
        <StatTile label="Chuỗi ngày tập" value={summary.streakDays} hint={summary.streakDays > 0 ? "ngày liên tiếp" : "Tập hôm nay để bắt đầu"} />
        <StatTile label="Tổng cộng" value={summary.total} hint={`${summary.sessions} buổi · kỷ lục ${summary.bestSession} rep/buổi`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="font-bold">Số rep 7 ngày gần nhất</h2>
          <p className="mb-6 text-sm text-muted">Tháng này: {summary.month} rep</p>
          <DailyBars days={summary.last7Days} today={localDateKey(new Date())} />
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-bold">Top tuần này</h2>
            <Link href="/leaderboard" className="text-sm font-semibold text-accent hover:underline">Xem tất cả</Link>
          </div>
          {weekBoard.length === 0 ? (
            <p className="text-sm text-muted">Chưa ai tập tuần này. Hãy là người đầu tiên!</p>
          ) : (
            <ol className="space-y-2">
              {weekBoard.slice(0, 5).map((e) => (
                <li key={e.userId} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${e.userId === user.id ? "bg-accent-soft" : "bg-surface-2"}`}>
                  <span className="w-6 text-center font-bold tabular-nums text-muted">{e.rank}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
                  <span className="font-bold tabular-nums">{e.reps}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 border-t border-line pt-4 text-sm text-ink-2">
            Cả công ty tuần này: <strong className="text-ink">{company.reps}</strong> rep từ{" "}
            <strong className="text-ink">{company.participants}</strong> người
          </p>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-bold">Buổi tập gần đây</h2>
          <Link href="/history" className="text-sm font-semibold text-accent hover:underline">Lịch sử</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Chưa có buổi tập nào.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-ink-2">{formatDateTime(w.startedAt)}</span>
                <span className="text-muted">{formatDuration(w.durationSec)}</span>
                <span className="w-20 text-right font-bold tabular-nums">{w.reps} rep</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
