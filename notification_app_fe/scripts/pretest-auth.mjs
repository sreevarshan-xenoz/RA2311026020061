import { readFile, writeFile } from "node:fs/promises";

try {
  const envFile = await readFile(".env.local", "utf8");

  for (const line of envFile.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    process.env[key] ??= value;
  }
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

const API_BASE = process.env.PRETEST_API_BASE;
const CLIENT_ID = process.env.PRETEST_CLIENT_ID;
const CLIENT_SECRET = process.env.PRETEST_CLIENT_SECRET;

const registrationPayload = {
  email: process.env.PRETEST_EMAIL,
  name: process.env.PRETEST_NAME,
  mobileNo: process.env.PRETEST_MOBILE_NO,
  githubUsername: process.env.PRETEST_GITHUB_USERNAME,
  rollNo: process.env.PRETEST_ROLL_NO,
  accessCode: process.env.PRETEST_ACCESS_CODE,
};

const requiredFields = Object.entries(registrationPayload).filter(
  ([, value]) => !value,
);

const missingConfig = [
  ["PRETEST_API_BASE", API_BASE],
  ...requiredFields.map(([key, value]) => [key, value]),
].filter(([, value]) => !value);

if (missingConfig.length > 0 && !(CLIENT_ID && CLIENT_SECRET)) {
  const missing = missingConfig.map(([key]) => key).join(", ");
  throw new Error(`Missing pre-test environment values: ${missing}`);
}

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let data;

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { rawResponse: responseText };
  }

  return { ok: response.ok, status: response.status, data };
}

let clientID = CLIENT_ID;
let clientSecret = CLIENT_SECRET;

if (!clientID || !clientSecret) {
  console.log("Registering candidate...");
  const registerResponse = await postJson("/register", registrationPayload);

  if (registerResponse.ok) {
    clientID = registerResponse.data.clientID ?? registerResponse.data.clientId;
    clientSecret = registerResponse.data.clientSecret;
    console.log("Registration successful.");
  } else if (registerResponse.status === 409) {
    console.warn("Registration failed: Email already exists. Please provide PRETEST_CLIENT_ID and PRETEST_CLIENT_SECRET in .env.local to authenticate directly.");
    
    // Attempt to read from existing .pretest-session.json if it exists
    try {
      const sessionData = await readFile(".pretest-session.json", "utf8");
      const session = JSON.parse(sessionData);
      clientID = session.clientID;
      clientSecret = session.clientSecret;
      console.log("Using credentials from existing .pretest-session.json");
    } catch {
      throw new Error(`Registration failed (409) and no existing session found. Please provide client credentials.`);
    }
  } else {
    throw new Error(
      `/register failed with ${registerResponse.status}: ${JSON.stringify(registerResponse.data)}`,
    );
  }
}

if (!clientID || !clientSecret) {
  throw new Error(
    "Could not obtain clientID and clientSecret.",
  );
}

const authPayload = {
  email: registrationPayload.email,
  name: registrationPayload.name,
  rollNo: registrationPayload.rollNo,
  accessCode: registrationPayload.accessCode,
  clientID,
  clientSecret,
};

console.log("Authenticating...");
const authResponse = await postJson("/auth", authPayload);

if (!authResponse.ok) {
  throw new Error(
    `/auth failed with ${authResponse.status}: ${JSON.stringify(authResponse.data)}`,
  );
}

const bearerToken =
  authResponse.data.access_token ?? authResponse.data.accessToken ?? authResponse.data.token;

if (!bearerToken) {
  throw new Error(
    `/auth did not return a bearer token: ${JSON.stringify(authResponse.data)}`,
  );
}

const session = {
  apiBase: API_BASE,
  email: registrationPayload.email,
  rollNo: registrationPayload.rollNo,
  clientID,
  clientSecret,
  bearerToken,
  authResponse: authResponse.data,
  savedAt: new Date().toISOString(),
};

await writeFile(".pretest-session.json", JSON.stringify(session, null, 2));

console.log("Pre-test credentials saved to notification_app_fe/.pretest-session.json");
console.log(`clientID: ${clientID}`);
console.log(`bearerToken: ${bearerToken.slice(0, 12)}...`);
