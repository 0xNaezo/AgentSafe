type ProgressMetricProps = {
  title: string;
  current: number;
  max: number;
  unit?: string;
  subtitle?: string;
  barColor?: "blue" | "orange" | "green" | "red";
  badge?: string;
  className?: string;
};

const barColorMap: Record<NonNullable<ProgressMetricProps["barColor"]>, string> = {
  blue: "bg-blue-500",
  orange: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
};

export function ProgressMetric({
  title,
  current,
  max,
  unit = "",
  subtitle,
  barColor = "blue",
  badge,
  className = "",
}: ProgressMetricProps) {
  const percent = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const percentRounded = Math.round(percent);

  const percentColor =
    percent >= 80
      ? "text-amber-600"
      : percent >= 95
        ? "text-rose-600"
        : "text-zinc-500";

  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-zinc-50 p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-zinc-500">{title}</p>
        {badge ? (
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500">
            {badge}
          </span>
        ) : (
          <span className={`text-sm font-semibold ${percentColor}`}>
            {percentRounded}%
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight text-zinc-950">
          {formatNumber(current)}
        </span>
        {max > 0 && !badge && (
          <span className="text-sm text-zinc-400">
            / {formatNumber(max)}
          </span>
        )}
        {unit && (
          <span className="ml-1 text-sm font-medium text-zinc-400">
            {unit}
          </span>
        )}
      </div>

      {!badge && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`progress-bar-fill h-full rounded-full ${barColorMap[barColor]}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {subtitle && (
        <p className="mt-2 text-xs text-zinc-400">{subtitle}</p>
      )}
    </div>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
