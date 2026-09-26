import type { ReactNode } from "react";
import DisclaimerNote from "@/components/DisclaimerNote";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <div className="mx-auto max-w-3xl px-6 pb-16">
        <DisclaimerNote variant="articles" />
      </div>
    </>
  );
}
