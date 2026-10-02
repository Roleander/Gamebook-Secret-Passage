export function confirmEmailMatches(input: string, accountEmail: string): boolean {
  const normalizedInput = input.trim().toLowerCase();
  const normalizedEmail = accountEmail.trim().toLowerCase();
  return normalizedInput.length > 0 && normalizedInput === normalizedEmail;
}
