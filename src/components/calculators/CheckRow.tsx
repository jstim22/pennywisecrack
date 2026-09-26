import type { ReactNode } from "react";

// A labelled checkbox row for advanced settings, with an optional
// explanation underneath the label.
export default function CheckRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={
        "flex justify-between gap-3 text-sm font-medium text-foreground/80 " +
        (description ? "items-start" : "items-center")
      }
    >
      <span>
        {label}
        {description && (
          <span className="mt-0.5 block text-xs font-normal text-foreground/50">
            {description}
          </span>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={
          "h-4 w-4 shrink-0 accent-navy dark:accent-baby-blue" +
          (description ? " mt-0.5" : "")
        }
      />
    </label>
  );
}
