import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learning — PennyWisecrack",
};

export default function Learning() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Learning</h1>
      <p className="mt-4 text-foreground/70">
        This is where educational content — guides, explainers, and articles
        on personal finance topics — will live.
      </p>
    </div>
  );
}
