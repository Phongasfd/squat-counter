import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { WorkoutClient } from "./workout-client";

export const metadata: Metadata = { title: "Tập luyện" };

export default async function WorkoutPage() {
  await requireUser();
  return <WorkoutClient />;
}
