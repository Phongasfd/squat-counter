import type { Metadata } from "next";
import { SubmitButton } from "@/components/submit-button";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { listUsersWithTotals } from "@/lib/users";
import { setActiveAction, setRoleAction } from "../actions";

export const metadata: Metadata = { title: "Quản trị" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  const users = listUsersWithTotals();
  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Quản trị thành viên</h1>
        <p className="mt-1 text-ink-2">
          {users.length} tài khoản · {activeCount} đang hoạt động
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Thành viên</th>
              <th className="px-4 py-3">Phòng ban</th>
              <th className="px-4 py-3 text-right">Tổng rep</th>
              <th className="px-4 py-3">Lần tập cuối</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => {
              const self = u.id === admin.id;
              return (
                <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name}{self && <span className="ml-2 text-xs text-accent">(bạn)</span>}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{u.department || "—"}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{u.totalReps}</td>
                  <td className="px-4 py-3 text-ink-2">{u.lastWorkoutAt ? formatDateTime(u.lastWorkoutAt) : "—"}</td>
                  <td className="px-4 py-3">
                    <form action={setRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="role" value={u.role === "admin" ? "member" : "admin"} />
                      <span className={u.role === "admin" ? "font-semibold text-accent" : "text-ink-2"}>
                        {u.role === "admin" ? "Quản trị" : "Thành viên"}
                      </span>
                      {!self && (
                        <SubmitButton className="btn-ghost h-7 px-2 text-xs" pendingText="…">
                          {u.role === "admin" ? "Hạ quyền" : "Cấp quyền"}
                        </SubmitButton>
                      )}
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <form action={setActiveAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="active" value={u.active ? "0" : "1"} />
                      <span className={u.active ? "text-good" : "text-danger"}>{u.active ? "● Hoạt động" : "● Đã khoá"}</span>
                      {!self && (
                        <SubmitButton className="btn-ghost h-7 px-2 text-xs" pendingText="…">
                          {u.active ? "Khoá" : "Mở khoá"}
                        </SubmitButton>
                      )}
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
