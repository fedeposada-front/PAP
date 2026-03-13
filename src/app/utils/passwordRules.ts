export function getPasswordRuleMessage(password: string): string | null {
  const value = password ?? "";
  if (value.length < 8) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (!/[A-Z]/.test(value)) {
    return "Le mot de passe doit contenir au moins une majuscule.";
  }
  if (!/[a-z]/.test(value) || !/[0-9]/.test(value)) {
    return "Le mot de passe doit être alphanumérique (au moins une lettre et un chiffre).";
  }
  return null;
}
