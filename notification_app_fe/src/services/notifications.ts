"use client";

import {
  loggedApiRequest,
  logEvent,
  saveBearerToken,
} from "@/services/logger";
import { API_BASE } from "@/services/api";

export type RegistrationPayload = {
  email: string;
  name: string;
  mobileNo: string;
  githubUsername: string;
  rollNo: string;
  accessCode: string;
};

export type AuthPayload = Pick<
  RegistrationPayload,
  "email" | "name" | "rollNo" | "accessCode"
> & {
  clientID: string;
  clientSecret: string;
};

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  timestamp: string;
};

type NotificationsResponse = {
  notifications?: Array<{
    ID?: string;
    Id?: string;
    id?: string;
    Type?: string;
    type?: string;
    Message?: string;
    message?: string;
    Timestamp?: string;
    timestamp?: string;
  }>;
};

export async function registerCandidate(payload: RegistrationPayload) {
  try {
    const response = await loggedApiRequest<
      RegistrationPayload,
      { clientID?: string; clientId?: string; clientSecret?: string }
    >({
      path: "/register",
      payload,
      errorMessage: `Register API error for ${payload.rollNo}`,
    });

    await logEvent({
      level: "info",
      package: "api",
      message: `Register success for ${payload.rollNo}`,
    });

    return {
      clientID: response.clientID ?? response.clientId ?? "",
      clientSecret: response.clientSecret ?? "",
    };
  } catch (error) {
    await logEvent({
      level: "error",
      package: "api",
      message: `Register failure for ${payload.rollNo}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });

    throw error;
  }
}

export async function authenticateCandidate(payload: AuthPayload) {
  try {
    const response = await loggedApiRequest<
      AuthPayload,
      { access_token?: string; accessToken?: string; token?: string }
    >({
      path: "/auth",
      payload,
      errorMessage: `Auth API error for ${payload.rollNo}`,
    });
    const token =
      response.access_token ?? response.accessToken ?? response.token ?? "";

    saveBearerToken(token);

    await logEvent({
      level: "info",
      package: "api",
      message: `Auth success for ${payload.rollNo}`,
    });

    return token;
  } catch (error) {
    await logEvent({
      level: "error",
      package: "api",
      message: `Auth failure for ${payload.rollNo}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });

    throw error;
  }
}

function getSessionBearerToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.sessionStorage.getItem("evaluationBearerToken") ?? "";
}

export async function getNotifications(params: {
  limit: number;
  page: number;
  notificationType: string;
}) {
  const token = getSessionBearerToken();
  const query = new URLSearchParams({
    limit: String(params.limit),
    page: String(params.page),
  });

  if (params.notificationType !== "all") {
    query.set("notification_type", params.notificationType);
  }

  try {
    if (!token) {
      throw new Error(
        "Missing session bearer token. Run register -> auth before fetching notifications.",
      );
    }

    const response = await fetch(`${API_BASE}/notifications?${query.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    const data = responseText
      ? (JSON.parse(responseText) as NotificationsResponse)
      : {};

    if (!response.ok) {
      throw new Error(
        `Notifications failed with status ${response.status}: ${responseText}`,
      );
    }

    const notifications = (data.notifications ?? []).map((notification) => ({
      id: notification.ID ?? notification.Id ?? notification.id ?? "",
      type: notification.Type ?? notification.type ?? "Unknown",
      message: notification.Message ?? notification.message ?? "",
      timestamp: notification.Timestamp ?? notification.timestamp ?? "",
    }));

    await logEvent({
      level: "info",
      package: "api",
      message: `Notifications success page=${params.page}, limit=${params.limit}, type=${params.notificationType}`,
    });

    return notifications;
  } catch (error) {
    await logEvent({
      level: "error",
      package: "api",
      message: `Notifications failure page=${params.page}, limit=${params.limit}, type=${params.notificationType}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    });
    throw error;
  }
}
