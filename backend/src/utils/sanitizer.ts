/** Sanitize error messages before storing in audit/history (NFR-400.4). */
export function sanitizeError(message: string): string {
  return String(message || 'Unknown error')
    .replace(/https?:\/\/[^\s]+/gi, '[URL]')
    .replace(/Bearer\s+\S+/gi, '[TOKEN]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/session[^=\s]*=\S+/gi, 'session=[REDACTED]')
    .slice(0, 200);
}
