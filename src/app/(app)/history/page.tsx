import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatDuration } from "@/lib/time";
import { listWorkouts } from "@/lib/workouts";
import { deleteWorkoutAction } from "../actions";

export const metadata: Metadata = { title: "Lịch sử" };

const PAGE_SIZE = 20;

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const user = await requireUser();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { items, total } = listWorkouts(user.id, PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Lịch sử tập luyện</h1>
          <p className="mt-1 text-ink-2">{total} buổi tập</p>
        </div>
        <Link href="/workout" className="btn-primary">Tập mới</Link>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-muted">Chưa có buổi tập nào.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Thời điểm</th>
                <th className="px-4 py-3 text-right">Thời lượng</th>
                <th className="px-4 py-3 text-right">Rep</th>
                <th className="w-px px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3 text-ink-2">{formatDateTime(w.startedAt)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-2">{formatDuration(w.durationSec)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{w.reps}</td>
                  <td className="px-2 py-1 text-right">
                    <form action={deleteWorkoutAction}>
                      <input type="hidden" name="id" value={w.id} />
                      <SubmitButton className="btn-ghost h-8 px-2 text-xs text-danger" pendingText="…">
                        Xoá
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link className="btn-secondary h-9" href={`/history?page=${page - 1}`}>Trước</Link>}
          <span className="px-2 text-muted">Trang {page}/{pages}</span>
          {page < pages && <Link className="btn-secondary h-9" href={`/history?page=${page + 1}`}>Sau</Link>}
        </div>
      )}
    </div>
  );
}
