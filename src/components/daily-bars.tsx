// Single-series bar chart of reps per day. No legend (the title names the series);
// hover shows the exact value; a visually hidden table carries the same data.

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function DailyBars({ days, today }: { days: { date: string; reps: number }[]; today: string }) {
  const max = Math.max(...days.map((d) => d.reps), 1);
  const label = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return { weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()], short: `${d}/${m}` };
  };

  return (
    <figure>
      <div className="flex h-40 items-end gap-2 border-b border-line" aria-hidden>
        {days.map((d) => {
          const isToday = d.date === today;
          return (
            <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end">
              <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-semibold text-bg opacity-0 shadow transition-opacity group-hover:opacity-100">
                {d.reps} rep · {label(d.date).short}
              </span>
              <div
                className={`w-full rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-100 ${isToday ? "" : "opacity-60"}`}
                style={{ height: d.reps > 0 ? `max(${(d.reps / max) * 100}%, 4px)` : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2" aria-hidden>
        {days.map((d) => (
          <span key={d.date} className={`flex-1 text-center text-xs ${d.date === today ? "font-bold text-ink" : "text-muted"}`}>
            {d.date === today ? "Hôm nay" : label(d.date).weekday}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Số rep mỗi ngày trong 7 ngày gần nhất</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.reps}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
