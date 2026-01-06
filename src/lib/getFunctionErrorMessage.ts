export function getFunctionErrorMessage(err: unknown): string {
  // Supabase Functions errors often include a `context` object with the HTTP status/body.
  const anyErr = err as any;

  // Prefer server-provided message if available
  const contextBody = anyErr?.context?.body;
  if (contextBody) {
    try {
      const parsed = typeof contextBody === "string" ? JSON.parse(contextBody) : contextBody;
      if (parsed?.error) return String(parsed.error);
      if (parsed?.message) return String(parsed.message);
    } catch {
      // ignore JSON parse errors
    }
  }

  if (anyErr?.message) return String(anyErr.message);
  return "Une erreur est survenue";
}
