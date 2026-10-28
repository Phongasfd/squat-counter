import type { Metadata } from "next";
import { LoginForm } from "../auth-forms";

export const metadata: Metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Đăng nhập</h1>
      <p className="mb-6 text-sm text-muted">Tiếp tục thử thách squat cùng đồng nghiệp.</p>
      <LoginForm />
    </>
  );
}
