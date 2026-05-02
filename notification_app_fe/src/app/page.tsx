"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  authenticateCandidate,
  getNotifications,
  registerCandidate,
  type NotificationItem,
  type RegistrationPayload,
} from "@/services/notifications";
import {
  readViewedNotificationIds,
  saveViewedNotificationIds,
} from "@/utils/priority";
import { API_BASE } from "@/services/api";
import { logEvent } from "@/services/logger";

const emptyForm: RegistrationPayload = {
  email: "",
  name: "",
  mobileNo: "",
  githubUsername: "",
  rollNo: "",
  accessCode: "",
};

const BEARER_TOKEN_STORAGE_KEY = "evaluationBearerToken";
const CLIENT_CREDENTIALS_STORAGE_KEY = "evaluationClientCredentials";
const REGISTRATION_PAYLOAD_STORAGE_KEY = "evaluationRegistrationPayload";

const filterOptions = ["all", "Placement", "Event", "Result"] as const;
const pageSizeOptions = [5, 10];

function formatTimestamp(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return parsedDate.toLocaleString();
}

function normalizeRegistrationPayload(
  payload: RegistrationPayload,
): RegistrationPayload {
  return {
    email: payload.email.trim(),
    name: payload.name.trim(),
    mobileNo: payload.mobileNo.trim(),
    githubUsername: payload.githubUsername.trim(),
    rollNo: payload.rollNo.trim(),
    accessCode: payload.accessCode.trim(),
  };
}

function readStoredRegistrationPayload(): RegistrationPayload {
  if (typeof window === "undefined") {
    return emptyForm;
  }

  const raw = window.sessionStorage.getItem(REGISTRATION_PAYLOAD_STORAGE_KEY);
  if (!raw) {
    return emptyForm;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RegistrationPayload>;
    return {
      email: parsed.email?.trim() ?? "",
      name: parsed.name?.trim() ?? "",
      mobileNo: parsed.mobileNo?.trim() ?? "",
      githubUsername: parsed.githubUsername?.trim() ?? "",
      rollNo: parsed.rollNo?.trim() ?? "",
      accessCode: parsed.accessCode?.trim() ?? "",
    };
  } catch {
    return emptyForm;
  }
}

export default function Home() {
  const initialToken =
    typeof window === "undefined"
      ? ""
      : window.sessionStorage.getItem(BEARER_TOKEN_STORAGE_KEY) ?? "";
  const initialForm =
    typeof window === "undefined" ? emptyForm : readStoredRegistrationPayload();
  const initialCredentials =
    typeof window === "undefined"
      ? { clientID: "", clientSecret: "" }
      : (() => {
          const raw = window.sessionStorage.getItem(CLIENT_CREDENTIALS_STORAGE_KEY);
          if (!raw) {
            return { clientID: "", clientSecret: "" };
          }

          try {
            const parsed = JSON.parse(raw) as {
              clientID?: string;
              clientSecret?: string;
            };
            return {
              clientID: parsed.clientID ?? "",
              clientSecret: parsed.clientSecret ?? "",
            };
          } catch {
            return { clientID: "", clientSecret: "" };
          }
        })();

  const [form, setForm] = useState(initialForm);
  const [clientID, setClientID] = useState(initialCredentials.clientID);
  const [clientSecret, setClientSecret] = useState(initialCredentials.clientSecret);
  const [tokenPreview, setTokenPreview] = useState(
    initialToken ? `${initialToken.slice(0, 12)}...` : "",
  );
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialToken));
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [viewedNotificationIds, setViewedNotificationIds] = useState<string[]>(
    () => readViewedNotificationIds(),
  );
  const [limit, setLimit] = useState(5);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    void logEvent({
      level: "info",
      package: "page",
      message: "Pre-test setup page loaded",
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void (async () => {
      setIsBusy(true);
      setStatus("Loading notifications...");
      try {
        const items = await getNotifications({
          limit,
          page,
          notificationType: filter,
        });
        setNotifications(items);
        setStatus(`Loaded ${items.length} notifications.`);
      } catch (error) {
        setStatus(
          error instanceof Error ? error.message : "Notifications fetch failed",
        );
      } finally {
        setIsBusy(false);
      }
    })();
  }, [filter, isAuthenticated, limit, page]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !viewedNotificationIds.includes(notification.id),
      ).length,
    [notifications, viewedNotificationIds],
  );

  function updateField(field: keyof RegistrationPayload) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value,
      }));
    };
  }

  async function handleSetupSubmit() {
    setIsBusy(true);
    setStatus("Authenticating...");

    try {
      const normalizedForm = normalizeRegistrationPayload(form);
      setForm(normalizedForm);
      window.sessionStorage.setItem(
        REGISTRATION_PAYLOAD_STORAGE_KEY,
        JSON.stringify(normalizedForm),
      );
      window.sessionStorage.removeItem(BEARER_TOKEN_STORAGE_KEY);
      let nextClientID = clientID.trim();
      let nextClientSecret = clientSecret.trim();
      setClientID(nextClientID);
      setClientSecret(nextClientSecret);

      if (
        !normalizedForm.email ||
        !normalizedForm.name ||
        !normalizedForm.rollNo ||
        !normalizedForm.accessCode
      ) {
        throw new Error(
          "Email, name, roll number, and access code are required for auth.",
        );
      }

      if (!nextClientID || !nextClientSecret) {
        setStatus("Registering candidate...");
        const credentials = await registerCandidate(normalizedForm);
        nextClientID = credentials.clientID;
        nextClientSecret = credentials.clientSecret;
        setClientID(nextClientID);
        setClientSecret(nextClientSecret);
        window.sessionStorage.setItem(
          CLIENT_CREDENTIALS_STORAGE_KEY,
          JSON.stringify(credentials),
        );
        setStatus("Registration succeeded. Authenticating...");
      }

      if (!nextClientID || !nextClientSecret) {
        throw new Error("Missing clientID/clientSecret. Complete registration first.");
      }

      window.sessionStorage.setItem(
        CLIENT_CREDENTIALS_STORAGE_KEY,
        JSON.stringify({
          clientID: nextClientID,
          clientSecret: nextClientSecret,
        }),
      );

      const token = await authenticateCandidate({
        email: normalizedForm.email,
        name: normalizedForm.name,
        rollNo: normalizedForm.rollNo,
        accessCode: normalizedForm.accessCode,
        clientID: nextClientID,
        clientSecret: nextClientSecret,
      });
      if (!token) {
        throw new Error("Auth succeeded but no bearer token was returned.");
      }
      setTokenPreview(`${token.slice(0, 12)}...`);
      setIsAuthenticated(true);
      setPage(1);
      setStatus("Auth succeeded. Notifications will load now.");
    } catch (error) {
      setIsAuthenticated(false);
      setStatus(
        error instanceof Error ? error.message : "Registration or auth failed",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function handleClearRuntimeData() {
    window.sessionStorage.removeItem(BEARER_TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(CLIENT_CREDENTIALS_STORAGE_KEY);
    window.sessionStorage.removeItem(REGISTRATION_PAYLOAD_STORAGE_KEY);
    window.sessionStorage.removeItem("evaluationFailedLogs");
    window.localStorage.removeItem("viewedNotificationIds");

    setForm(emptyForm);
    setClientID("");
    setClientSecret("");
    setTokenPreview("");
    setIsAuthenticated(false);
    setNotifications([]);
    setViewedNotificationIds([]);
    setPage(1);
    setStatus(
      "Cleared local/session storage. First run: register -> auth -> notifications. Next runs: auth -> notifications.",
    );

    void logEvent({
      level: "info",
      package: "component",
      message: "Runtime storage cleared from setup page",
    });
  }

  function handleFilterChange(nextFilter: string) {
    setFilter(nextFilter);
    setPage(1);

    void logEvent({
      level: "info",
      package: "component",
      message: `Notification filter changed to ${nextFilter}`,
    });
  }

  function handleNotificationClick(notificationId: string) {
    setViewedNotificationIds((currentIds) => {
      if (currentIds.includes(notificationId)) {
        return currentIds;
      }

      const updatedIds = [...currentIds, notificationId];
      saveViewedNotificationIds(updatedIds);
      return updatedIds;
    });

    void logEvent({
      level: "info",
      package: "component",
      message: `Notification opened: ${notificationId}`,
    });
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", py: 4 }}>
      <Container maxWidth="lg">
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" color="success.main">
              Campus Hiring Evaluation
            </Typography>
            <Typography variant="h4" component="h1" sx={{ mt: 0.5 }}>
              Main inbox
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Use the setup panel to register/authenticate, then load and review
              notifications.
            </Typography>
            <Button component={Link} href="/priority" sx={{ mt: 1.5 }} size="small">
              Open priority page
            </Button>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "1fr",
                md: "minmax(0, 2fr) minmax(280px, 1fr)",
              },
            }}
          >
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Setup & auth
                </Typography>
                <Box
                  component="form"
                  sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  }}
                >
                  <TextField
                    label="Email"
                    value={form.email}
                    onChange={updateField("email")}
                    fullWidth
                  />
                  <TextField
                    label="Name"
                    value={form.name}
                    onChange={updateField("name")}
                    fullWidth
                  />
                  <TextField
                    label="Mobile"
                    value={form.mobileNo}
                    onChange={updateField("mobileNo")}
                    fullWidth
                  />
                  <TextField
                    label="GitHub username"
                    value={form.githubUsername}
                    onChange={updateField("githubUsername")}
                    fullWidth
                  />
                  <TextField
                    label="Roll number"
                    value={form.rollNo}
                    onChange={updateField("rollNo")}
                    fullWidth
                  />
                  <TextField
                    label="Access code"
                    value={form.accessCode}
                    onChange={updateField("accessCode")}
                    fullWidth
                  />
                  <TextField
                    label="Client ID"
                    value={clientID}
                    onChange={(event) => setClientID(event.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Client secret"
                    value={clientSecret}
                    onChange={(event) => setClientSecret(event.target.value)}
                    fullWidth
                  />
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }}>
                  <Button variant="contained" onClick={handleSetupSubmit} disabled={isBusy}>
                    {isBusy ? "Working..." : "Submit setup"}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleClearRuntimeData}
                    disabled={isBusy}
                  >
                    Clear runtime data
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Runtime status
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {status}
                </Typography>
                <Typography
                  variant="caption"
                  component="p"
                  color="text.secondary"
                  sx={{ mt: 1.5, overflowWrap: "anywhere" }}
                >
                  Bearer token: {tokenPreview || "Not available yet"}
                </Typography>
                <Typography
                  variant="caption"
                  component="p"
                  color="text.secondary"
                  sx={{ mt: 2, overflowWrap: "anywhere" }}
                >
                  API base: {API_BASE || "Missing local env value"}
                </Typography>
              </CardContent>
            </Card>
          </Box>

          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{ justifyContent: "space-between" }}
              >
                <Typography variant="h6">Notifications</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <Chip
                    size="small"
                    label={`Unread: ${unreadCount} | Viewed: ${
                      notifications.length - unreadCount
                    }`}
                  />
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id="filter-label">Filter</InputLabel>
                    <Select
                      labelId="filter-label"
                      label="Filter"
                      value={filter}
                      onChange={(event: SelectChangeEvent<string>) =>
                        handleFilterChange(event.target.value)
                      }
                      disabled={!isAuthenticated || isBusy}
                    >
                      {filterOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel id="limit-label">Limit</InputLabel>
                    <Select
                      labelId="limit-label"
                      label="Limit"
                      value={String(limit)}
                      onChange={(event) => {
                        setLimit(Number(event.target.value));
                        setPage(1);
                      }}
                      disabled={!isAuthenticated || isBusy}
                    >
                      {pageSizeOptions.map((size) => (
                        <MenuItem key={size} value={String(size)}>
                          {size}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>

              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {!isAuthenticated ? (
                  <Typography variant="body2" color="text.secondary">
                    Complete setup to load notifications.
                  </Typography>
                ) : notifications.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No notifications found for this page/filter.
                  </Typography>
                ) : (
                  notifications.map((notification) => {
                    const isViewed = viewedNotificationIds.includes(notification.id);
                    return (
                      <Card key={notification.id} variant="outlined">
                        <CardActionArea
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          <CardContent>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              sx={{ alignItems: { xs: "flex-start", sm: "center" } }}
                            >
                              <Typography variant="overline">
                                {notification.type}
                              </Typography>
                              <Chip
                                size="small"
                                label={isViewed ? "Viewed" : "Unread"}
                                color={isViewed ? "default" : "primary"}
                              />
                            </Stack>
                            <Typography variant="subtitle1" sx={{ mt: 1 }}>
                              {notification.message}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              {formatTimestamp(notification.timestamp)}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    );
                  })
                )}
              </Stack>

              <Stack
                direction="row"
                spacing={1.5}
                sx={{ mt: 2, justifyContent: "flex-end" }}
              >
                <Button
                  variant="outlined"
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={!isAuthenticated || isBusy || page === 1}
                >
                  Previous
                </Button>
                <Typography variant="body2" sx={{ alignSelf: "center" }}>
                  Page {page}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  disabled={!isAuthenticated || isBusy || notifications.length < limit}
                >
                  Next
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
