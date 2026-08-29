export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8 text-sm text-foreground/60 sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} PennyWisecrack. All rights reserved.</p>
        <p>Personal finance made a little less painful.</p>
      </div>
    </footer>
  );
}
