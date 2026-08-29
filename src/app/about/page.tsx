import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us — PennyWisecrack",
};

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">About Us</h1>
      <p className="mt-4 text-foreground/70">
        This page will tell the PennyWisecrack story — who we are, why we
        started this, and what we believe about personal finance.
      </p>
    </div>
  );
}
