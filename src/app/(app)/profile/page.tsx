import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { listDepartments } from "@/lib/users";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Hồ sơ" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Hồ sơ</h1>
      <div className="card p-6">
        <dl className="mb-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="font-medium">{user.email}</dd>
          <dt className="text-muted">Vai trò</dt>
          <dd className="font-medium">{user.role === "admin" ? "Quản trị viên" : "Thành viên"}</dd>
        </dl>
        <ProfileForm name={user.name} department={user.department} departments={listDepartments()} />
      </div>
    </div>
  );
}
