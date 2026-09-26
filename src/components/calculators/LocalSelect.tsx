import NumberField from "./NumberField";
import { getState } from "@/lib/stateTax";

// The follow-up question that appears once a state with city/county income
// taxes is picked (e.g. "Which county do you live in?" for Maryland).
export default function LocalSelect({
  stateCode,
  localId,
  onLocalChange,
  customRate,
  onCustomRateChange,
}: {
  stateCode: string;
  localId: string;
  onLocalChange: (id: string) => void;
  customRate: number;
  onCustomRateChange: (rate: number) => void;
}) {
  const rule = getState(stateCode)?.local;
  if (!rule) return null;

  const selected = rule.options.find((o) => o.id === localId);

  return (
    <div>
      <label htmlFor="local" className="block">
        <span className="text-sm font-medium text-foreground/80">
          {rule.question}
        </span>
        <select
          id="local"
          value={localId}
          onChange={(e) => onLocalChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-navy dark:focus:border-baby-blue"
        >
          <option value="">Select one</option>
          {rule.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {selected?.custom && (
        <div className="mt-3">
          <NumberField
            id="localCustomRate"
            label="Your local income tax rate"
            value={customRate}
            onChange={onCustomRateChange}
            suffix="%"
            step={0.05}
          />
        </div>
      )}

      {rule.hint && (
        <p className="mt-1.5 text-xs text-foreground/50">{rule.hint}</p>
      )}
    </div>
  );
}
