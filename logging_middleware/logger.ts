"use client";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type FrontendPackage =
  | "api"
  | "component"
  | "hook"
  | "page"
  | "state"
  | "style";

type LogInput = {
  level: LogLevel;
  package: FrontendPackage;
  message: string;
};

type LoggedApiRequestOptions<TPayload> = {
  path: string;
  payload: TPayload;
  errorMessage: string;
};

const API_BASE =
  typeof window !== "undefined"
    ? "/api/evaluation-service"
    : (process.env.NEXT_PUBLIC_EVALUATION_API_BASE ?? "");
const TOKEN_STORAGE_KEY = "evaluationBearerToken";
const FAILED_LOGS_STORAGE_KEY = "evaluationFailedLogs";

function getStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ??
    process.env.NEXT_PUBLIC_EVALUATION_BEARER_TOKEN ??
    ""
  );
}

function rememberFailedLog(input: LogInput) {
  if (typeof window === "undefined") {
    return;
  }

  const existingLogs = window.sessionStorage.getItem(FAILED_LOGS_STORAGE_KEY);
  const failedLogs = existingLogs ? JSON.parse(existingLogs) : [];

  window.sessionStorage.setItem(
    FAILED_LOGS_STORAGE_KEY,
    JSON.stringify([
      ...failedLogs,
      { ...input, failedAt: new Date().toISOString() },
    ]),
  );
}

export function saveBearerToken(token: string) {
  if (typeof window === "undefined" || !token) {
    return;
  }

  window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export async function logEvent(input: LogInput) {
  if (!API_BASE) {
    rememberFailedLog(input);
    return;
  }

  const token = getStoredToken();

  try {
    const response = await fetch(`${API_BASE}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        stack: "frontend",
        level: input.level,
        package: input.package,
        message: input.message,
      }),
    });

    if (!response.ok) {
      rememberFailedLog({
        ...input,
        message: `${input.message} | log API failed with ${response.status}`,
      });
    }
  } catch {
    rememberFailedLog(input);
  }
}

export async function loggedApiRequest<TPayload, TResponse>({
  path,
  payload,
  errorMessage,
}: LoggedApiRequestOptions<TPayload>): Promise<TResponse> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
      throw new Error(
        data.message ?? `${path} failed with status ${response.status}`,
      );
    }

    return data as TResponse;
  } catch (error) {
    await logEvent({
      level: "error",
      package: "api",
      message: `${errorMessage}: ${
        error instanceof Error ? error.message : "Unknown API error"
      }`,
    });

    throw error;
  }
}
