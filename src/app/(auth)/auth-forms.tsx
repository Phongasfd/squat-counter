"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { login, register } from "./actions";

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">Email công ty</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </div>
      <div>
        <label className="label" htmlFor="password">Mật khẩu</label>
        <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="btn-primary w-full" pendingText="Đang đăng nhập…">Đăng nhập</SubmitButton>
      <p className="text-center text-sm text-muted">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">Đăng ký</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ departments }: { departments: string[] }) {
  const [state, action] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Họ và tên</label>
        <input className="input" id="name" name="name" autoComplete="name" required defaultValue={state?.fields?.name} />
      </div>
      <div>
        <label className="label" htmlFor="email">Email công ty</label>
        <input className="input" id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </div>
      <div>
        <label className="label" htmlFor="department">Phòng ban / Team</label>
        <input
          className="input"
          id="department"
          name="department"
          list="departments"
          placeholder="VD: Kỹ thuật, Marketing…"
          defaultValue={state?.fields?.department}
        />
        <datalist id="departments">
          {departments.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </div>
      <div>
        <label className="label" htmlFor="password">Mật khẩu</label>
        <input className="input" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="mt-1 text-xs text-muted">Ít nhất 8 ký tự</p>
      </div>
      <FormError message={state?.error} />
      <SubmitButton className="btn-primary w-full" pendingText="Đang tạo tài khoản…">Tạo tài khoản</SubmitButton>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">Đăng nhập</Link>
      </p>
    </form>
  );
}
