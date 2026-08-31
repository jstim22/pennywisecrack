import CurrencyInput from "./CurrencyInput";
import PlainNumberInput from "./PlainNumberInput";

export default function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  step = "any",
  prefix,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number | "any";
  prefix?: string;
  suffix?: string;
}) {
  const isCurrency = prefix === "$";

  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      <div className="mt-1 flex items-center rounded-md border border-border focus-within:border-navy dark:focus-within:border-baby-blue">
        {prefix && (
          <span className="pl-3 text-sm text-foreground/50">{prefix}</span>
        )}
        {isCurrency ? (
          <CurrencyInput
            id={id}
            value={value}
            onChange={onChange}
            className="w-full min-w-0 bg-transparent px-3 py-2 text-sm outline-none"
          />
        ) : (
          <PlainNumberInput
            id={id}
            value={value}
            onChange={onChange}
            min={min}
            step={step}
            className="w-full min-w-0 bg-transparent px-3 py-2 text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        )}
        {suffix && (
          <span className="pr-3 text-sm text-foreground/50">{suffix}</span>
        )}
      </div>
    </label>
  );
}
