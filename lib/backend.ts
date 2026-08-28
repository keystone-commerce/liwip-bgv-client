const backendUrl = process.env.VERIFICATION_API_URL || "http://localhost:3000";
const apiKey = process.env.VERIFICATION_API_KEY;

export class BackendError extends Error {
  constructor(public readonly status: number, message: string, public readonly details?: unknown) {
    super(message);
  }
}

export function backendHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (apiKey) headers.set("X-API-Key", apiKey);
  return headers;
}

export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    cache: "no-store",
    headers: backendHeaders(init?.headers)
  });
  return response;
}

export async function readBackendResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  let body: unknown = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* retain provider text */ }
  if (!response.ok) {
    const message = typeof body === "object" && body && "message" in body
      ? String((body as { message: unknown }).message)
      : `Verification backend returned HTTP ${response.status}`;
    throw new BackendError(response.status, message, body);
  }
  return body;
}
