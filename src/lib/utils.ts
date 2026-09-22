import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function updateAllNumberReferences(content: string, mapping: Map<number, number>): string {
  const tempPrefix = "§REF§";
  const tempSuffix = "§/REF§";
  let result = content;

  for (const [oldNum, newNum] of mapping) {
    const regex = new RegExp(`\\b${oldNum}\\b`, "g");
    result = result.replace(regex, `${tempPrefix}${newNum}${tempSuffix}`);
  }

  const tempRegex = new RegExp(`${tempPrefix}(\\d+)${tempSuffix}`, "g");
  result = result.replace(tempRegex, "$1");

  return result;
}
