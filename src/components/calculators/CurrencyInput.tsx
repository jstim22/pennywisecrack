"use client";

import { useEffect, useRef, useState } from "react";

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CurrencyInput({
  id,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = focused ? rawText : formatMoney(value);

  useEffect(() => {
    if (focused) inputRef.current?.select();
  }, [focused]);

  return (
    <input
      ref={inputRef}
      id={id}
      aria-label={ariaLabel}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={() => {
        setFocused(true);
        setRawText(value === 0 ? "" : String(value));
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const cleaned = e.target.value.replace(/[^0-9.]/g, "");
        setRawText(cleaned);
        const num = parseFloat(cleaned);
        onChange(Number.isFinite(num) ? num : 0);
      }}
      className={className}
    />
  );
}
