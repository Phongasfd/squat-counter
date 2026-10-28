"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requireUser } from "@/lib/auth";
import { setUserActive, setUserRole, updateProfile } from "@/lib/users";
import { deleteWorkout, saveWorkout, WORKOUT_LIMITS } from "@/lib/workouts";

const workoutSchema = z
  .object({
    reps: z.number().int().min(1).max(WORKOUT_LIMITS.maxReps),
    durationSec: z.number().int().min(1).max(WORKOUT_LIMITS.maxDurationSec),
    startedAt: z.iso.datetime(),
  })
  .refine((w) => w.durationSec >= w.reps * WORKOUT_LIMITS.minSecondsPerRep, {
    message: "Tốc độ squat không hợp lệ",
  })
  .refine((w) => {
    const started = Date.parse(w.startedAt);
    // Must have started in the past, no earlier than its duration + a grace period allows.
    return started <= Date.now() + 60_000 && started >= Date.now() - (w.durationSec + 15 * 60) * 1000;
  }, "Thời gian bắt đầu không hợp lệ");

export type SaveWorkoutResult = { ok: true; id: number } | { ok: false; error: string };

export async function saveWorkoutAction(input: unknown): Promise<SaveWorkoutResult> {
  const user = await requireUser();
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const id = saveWorkout(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function deleteWorkoutAction(formData: FormData) {
  const user = await requireUser();
  deleteWorkout(user.id, Number(formData.get("id")));
  revalidatePath("/", "layout");
}

export type ProfileState = { error?: string; saved?: boolean } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Tên cần ít nhất 2 ký tự").max(80),
  department: z.string().trim().max(80),
});

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name") ?? "",
    department: formData.get("department") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  updateProfile(user.id, parsed.data);
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function setRoleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (id === admin.id) return; // admins can't demote themselves (avoids locking everyone out)
  setUserRole(id, formData.get("role") === "admin" ? "admin" : "member");
  revalidatePath("/admin");
}

export async function setActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (id === admin.id) return;
  setUserActive(id, formData.get("active") === "1");
  revalidatePath("/admin");
}
