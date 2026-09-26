export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <div
      className="mt-1 grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={
            "rounded-md border py-1.5 text-sm font-medium transition-colors " +
            (value === o.value
              ? "border-navy bg-navy text-white dark:border-baby-blue dark:bg-baby-blue dark:text-navy"
              : "border-border hover:bg-surface-hover")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
