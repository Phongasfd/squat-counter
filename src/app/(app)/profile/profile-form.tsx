"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { updateProfileAction } from "../actions";

export function ProfileForm(props: { name: string; department: string; departments: string[] }) {
  const [state, action] = useActionState(updateProfileAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Họ và tên</label>
        <input className="input" id="name" name="name" required defaultValue={props.name} />
      </div>
      <div>
        <label className="label" htmlFor="department">Phòng ban / Team</label>
        <input className="input" id="department" name="department" list="departments" defaultValue={props.department} />
        <datalist id="departments">
          {props.departments.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>
      </div>
      {state?.error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state?.saved && <p role="status" className="rounded-xl bg-good-soft px-3 py-2 text-sm text-good">Đã lưu thay đổi</p>}
      <SubmitButton pendingText="Đang lưu…">Lưu</SubmitButton>
    </form>
  );
}
