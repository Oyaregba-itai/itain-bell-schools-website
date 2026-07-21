import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns age as "7 yrs", "7+ yrs", "8 yrs" etc.
 * "+" is added only when the child is within 4 months of their next birthday.
 */
export function formatAge(dob: string | null | undefined, suffix = " yrs"): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  const now = new Date();

  // Check whether this year's birthday has already occurred
  const birthdayThisYear = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  const birthdayPassed = now >= birthdayThisYear;

  // Completed years
  const years = now.getFullYear() - birth.getFullYear() - (birthdayPassed ? 0 : 1);

  // Next upcoming birthday
  const nextBirthday = birthdayPassed
    ? new Date(now.getFullYear() + 1, birth.getMonth(), birth.getDate())
    : birthdayThisYear;

  // Show "+" only when within 4 months of next birthday
  const fourMonthsBefore = new Date(nextBirthday);
  fourMonthsBefore.setMonth(fourMonthsBefore.getMonth() - 4);
  const showPlus = now >= fourMonthsBefore;

  return `${years}${showPlus ? "+" : ""}${suffix}`;
}
