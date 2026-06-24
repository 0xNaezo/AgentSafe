type StatusDotProps = {
  color?: "green" | "orange" | "red" | "blue" | "gray";
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
};

const colorMap: Record<NonNullable<StatusDotProps["color"]>, string> = {
  green: "bg-emerald-500",
  orange: "bg-amber-500",
  red: "bg-rose-500",
  blue: "bg-sky-500",
  gray: "bg-zinc-400",
};

const sizeMap: Record<NonNullable<StatusDotProps["size"]>, string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
};

export function StatusDot({
  color = "green",
  pulse = false,
  size = "sm",
  className = "",
}: StatusDotProps) {
  return (
    <span
      className={`inline-block rounded-full ${colorMap[color]} ${sizeMap[size]} ${
        pulse ? "status-dot-pulse" : ""
      } ${className}`}
      aria-hidden="true"
    />
  );
}
