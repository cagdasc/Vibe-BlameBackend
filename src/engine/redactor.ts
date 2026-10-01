/**
 * Sensitive Data Redactor for Android Network Inspector
 * Default redacted headers:
 * - Authorization
 * - Proxy-Authorization
 * - Cookie
 * - Set-Cookie
 * - X-API-Key
 * - X-Auth-Token
 */

export const DEFAULT_SENSITIVE_HEADERS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'apikey',
  'access-token'
];

export class HeaderRedactor {
  private sensitiveHeaders: Set<string>;

  constructor(customHeaders: string[] = []) {
    this.sensitiveHeaders = new Set(
      [...DEFAULT_SENSITIVE_HEADERS, ...customHeaders].map(h => h.toLowerCase())
    );
  }

  public isSensitive(headerName: string): boolean {
    return this.sensitiveHeaders.has(headerName.toLowerCase());
  }

  public redactHeaders(headers: Record<string, string>): {
    redacted: Record<string, string>;
    redactedKeys: string[];
  } {
    const redacted: Record<string, string> = {};
    const redactedKeys: string[] = [];

    for (const [key, value] of Object.entries(headers)) {
      if (this.isSensitive(key)) {
        redacted[key] = '<redacted>';
        redactedKeys.push(key);
      } else {
        redacted[key] = value;
      }
    }

    return { redacted, redactedKeys };
  }
}

export const defaultRedactor = new HeaderRedactor();
