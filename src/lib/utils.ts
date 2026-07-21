import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns age as "7+ yrs", "8 yrs" etc.
 * "+" means the child has passed their birthday this year but hasn't turned the next age yet.
 * Only omitted on the exact birthday.
 */
export function formatAge(dob: string | null | undefined, suffix = " yrs"): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const mDiff = now.getMonth() - birth.getMonth();
  const dDiff = now.getDate() - birth.getDate();
  if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) years--;
  const exactBirthday = mDiff === 0 && dDiff === 0;
  return `${years}${exactBirthday ? "" : "+"}${suffix}`;
}
