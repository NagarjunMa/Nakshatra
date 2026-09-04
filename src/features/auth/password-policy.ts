export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_HELP = "Use at least 8 characters, including a letter and a number.";

/** Mirrors the repository-owned Supabase password policy for immediate, consistent feedback. */
export function isAcceptablePassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH
    && password.length <= PASSWORD_MAX_LENGTH
    && /[A-Za-z]/.test(password)
    && /\d/.test(password);
}
