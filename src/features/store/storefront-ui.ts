import { cn } from "@/lib/utils";

const navToneBase = "border bg-white text-zinc-700 transition";
const navToneActive =
  "border-zinc-300 text-zinc-900 shadow-[inset_0_-2px_0_0_#2C2CB7] hover:border-zinc-300 hover:bg-white";
const navToneIdle = "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900";

export function navToneClass(isActive: boolean): string {
  return cn(navToneBase, isActive ? navToneActive : navToneIdle);
}

const chipToneBase = "border transition";
const chipToneActive = "border-[#2C2CB7] bg-[#2C2CB7] text-white";
const chipToneIdle = "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50";

export function chipToneClass(isActive: boolean): string {
  return cn(chipToneBase, isActive ? chipToneActive : chipToneIdle);
}
