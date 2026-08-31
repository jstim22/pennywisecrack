"use client";

import { useEffect, useRef, useState } from "react";

export default function PlainNumberInput({
  id,
  value,
  onChange,
  min,
  step,
  className,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number | "any";
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = focused
    ? rawText
    : Number.isFinite(value)
      ? String(value)
      : "";

  useEffect(() => {
    if (focused) inputRef.current?.select();
  }, [focused]);

  return (
    <input
      ref={inputRef}
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={displayValue}
      onFocus={() => {
        setFocused(true);
        setRawText(value === 0 ? "" : String(value));
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value;
        setRawText(raw);
        onChange(raw === "" ? 0 : Number(raw));
      }}
      className={className}
    />
  );
}
