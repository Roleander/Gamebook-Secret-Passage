type Translate = (key: string) => string;

const AUTH_ERROR_CODES: Record<string, string> = {
  REGISTER_MISSING: "Auth.errRegisterMissing",
  EMAIL_TAKEN: "Auth.errEmailTaken",
  REGISTER_SERVER: "Auth.registerError",
  EMAIL_REQUIRED: "Auth.errForgotMissing",
  FORGOT_SERVER: "Auth.errForgotServer",
  RESET_MISSING: "Auth.errResetMissing",
  WEAK_PASSWORD: "Auth.passwordTooShort",
  TOKEN_INVALID: "Auth.errTokenInvalid",
  TOKEN_EXPIRED: "Auth.errTokenExpired",
  TOKEN_USED: "Auth.errTokenUsed",
  RESET_SERVER: "Auth.resetError",
};

export function authError(
  t: Translate,
  data: { code?: string; error?: string } | null | undefined,
  fallbackKey: string
): string {
  if (data?.code) {
    const key = AUTH_ERROR_CODES[data.code];
    if (key) return t(key);
  }
  return data?.error || t(fallbackKey);
}
