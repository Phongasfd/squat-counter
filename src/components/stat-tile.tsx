export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
