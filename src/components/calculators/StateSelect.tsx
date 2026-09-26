import { STATES, describeState, getState } from "@/lib/stateTax";

export default function StateSelect({
  value,
  onChange,
  hideNote = false,
  helper,
}: {
  value: string;
  onChange: (code: string) => void;
  // Skip the state's extra note (e.g. "local taxes aren't included") for
  // tools that handle those taxes themselves.
  hideNote?: boolean;
  // Replaces the text under the dropdown (which is about income tax).
  helper?: string;
}) {
  const rule = getState(value);

  return (
    <div>
      <label htmlFor="state" className="block">
        <span className="text-sm font-medium text-foreground/80">
          Your state
        </span>
        <select
          id="state"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-navy dark:focus:border-baby-blue"
        >
          <option value="">Select your state</option>
          {STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1.5 text-xs text-foreground/50">
        {helper !== undefined
          ? helper
          : rule
          ? `${rule.name} ${describeState(rule)}.${
              rule.note && !hideNote ? ` ${rule.note}` : ""
            }`
          : hideNote
            ? "Pick your state to include state income tax."
            : "Pick your state to include state income tax. Local taxes (some cities and counties) aren't included."}
      </p>
    </div>
  );
}
