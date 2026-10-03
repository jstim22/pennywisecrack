// One accent color per calculator section, from the validated chart palette
// (blue, orange, aqua, yellow, magenta — each stepped for light and dark).
// Full class names are written out so Tailwind can see them.
export const SECTION_ACCENTS: Record<
  string,
  { bubble: string; tile: string; chip: string }
> = {
  "money-basics": {
    bubble: "bg-[#2a78d6] dark:bg-[#3987e5]",
    tile: "bg-[#2a78d6]/8 hover:border-[#2a78d6] dark:bg-[#3987e5]/10 dark:hover:border-[#3987e5]",
    chip: "bg-[#2a78d6]/12 dark:bg-[#3987e5]/20",
  },
  "paychecks-taxes": {
    bubble: "bg-[#eb6834] dark:bg-[#d95926]",
    tile: "bg-[#eb6834]/8 hover:border-[#eb6834] dark:bg-[#d95926]/10 dark:hover:border-[#d95926]",
    chip: "bg-[#eb6834]/12 dark:bg-[#d95926]/20",
  },
  "saving-growing": {
    bubble: "bg-[#1baf7a] dark:bg-[#199e70]",
    tile: "bg-[#1baf7a]/8 hover:border-[#1baf7a] dark:bg-[#199e70]/10 dark:hover:border-[#199e70]",
    chip: "bg-[#1baf7a]/12 dark:bg-[#199e70]/20",
  },
  "big-purchase": {
    bubble: "bg-[#eda100] dark:bg-[#c98500]",
    tile: "bg-[#eda100]/8 hover:border-[#eda100] dark:bg-[#c98500]/10 dark:hover:border-[#c98500]",
    chip: "bg-[#eda100]/15 dark:bg-[#c98500]/20",
  },
  "paying-off-debt": {
    bubble: "bg-[#e87ba4] dark:bg-[#d55181]",
    tile: "bg-[#e87ba4]/10 hover:border-[#e87ba4] dark:bg-[#d55181]/10 dark:hover:border-[#d55181]",
    chip: "bg-[#e87ba4]/15 dark:bg-[#d55181]/20",
  },
};

export const FALLBACK_ACCENT = SECTION_ACCENTS["money-basics"];
