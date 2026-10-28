"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, deleteSession } from "@/lib/auth";
import { createUser, findUserWithPasswordByEmail } from "@/lib/users";

export type AuthFormState = { error?: string; fields?: Record<string, string> } | undefined;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự").max(80),
  email: z.email("Email không hợp lệ").trim().toLowerCase(),
  department: z.string().trim().max(80),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự").max(128),
});

function allowedDomain(email: string): boolean {
  const domains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  return domains.length === 0 || domains.includes(email.split("@")[1]);
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    department: String(formData.get("department") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const fields = { name: raw.name, email: raw.email, department: raw.department };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  if (!allowedDomain(parsed.data.email)) {
    return { error: "Chỉ email công ty mới được phép đăng ký", fields };
  }

  const user = createUser({
    email: parsed.data.email,
    name: parsed.data.name,
    department: parsed.data.department,
    passwordHash: await bcrypt.hash(parsed.data.password, 10),
  });
  if (!user) return { error: "Email này đã được đăng ký", fields };

  await createSession(user);
  redirect("/dashboard");
}

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = loginSchema.parse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  const fields = { email };

  const user = findUserWithPasswordByEmail(email);
  // Always run bcrypt so response time doesn't reveal whether the email exists.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return { error: "Email hoặc mật khẩu không đúng", fields };
  if (!user.active) return { error: "Tài khoản đã bị vô hiệu hoá. Liên hệ quản trị viên.", fields };

  await createSession(user);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
