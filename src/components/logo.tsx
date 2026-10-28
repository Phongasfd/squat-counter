export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="4.5" r="2" />
          <path d="M12 7v5l-4 3 3 5M12 12l4 3-3 5M7 10h10" />
        </svg>
      </span>
      Squat Counter
    </span>
  );
}
