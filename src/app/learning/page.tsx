import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning — PennyWisecrack",
};

export default function Learning() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-navy dark:text-baby-blue">
        Learning
      </h1>
      <p className="mt-4 text-foreground/70">
        This is where the lessons live — short, simple guides on saving,
        budgeting, credit, and the other money stuff school never really
        covers.
      </p>
    </div>
  );
}
