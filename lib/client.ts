"use client";
// Клиент талын fetch туслах: серверийн монгол алдааны мессежийг шууд гаргана.

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, opts: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = opts;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, "Сүлжээний холболт тасарлаа. Интернэтээ шалгаад дахин оролдоно уу.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const details = (data as { details?: { message: string }[] }).details;
    const first = Array.isArray(details) && details[0]?.message;
    throw new ApiError(res.status, first || (data as { error?: string }).error || "Алдаа гарлаа.", details);
  }
  return data as T;
}

export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
