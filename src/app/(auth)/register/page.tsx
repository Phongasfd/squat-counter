import type { Metadata } from "next";
import { connection } from "next/server";
import { listDepartments } from "@/lib/users";
import { RegisterForm } from "../auth-forms";

export const metadata: Metadata = { title: "Đăng ký" };

export default async function RegisterPage() {
  await connection(); // read departments per request, not at build time
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Tạo tài khoản</h1>
      <p className="mb-6 text-sm text-muted">Dành cho thành viên công ty.</p>
      <RegisterForm departments={listDepartments()} />
    </>
  );
}
