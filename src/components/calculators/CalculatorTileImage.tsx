import type { ComponentType } from "react";

export default function CalculatorTileImage({
  icon: Icon,
  className = "",
}: {
  icon: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-navy to-baby-blue ${className}`}
      aria-hidden="true"
    >
      <Icon className="h-10 w-10 text-white" />
    </div>
  );
}
