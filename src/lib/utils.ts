import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function updateAllNumberReferences(content: string, mapping: Map<number, number>): string {
  if (mapping.size === 0) return content;

  const keys = Array.from(mapping.keys()).sort((a, b) => b - a);
  const pattern = new RegExp(`\\b(${keys.join("|")})\\b`, "g");

  return content.replace(pattern, (match) => {
    const newNum = mapping.get(Number(match));
    return newNum !== undefined ? String(newNum) : match;
  });
}
