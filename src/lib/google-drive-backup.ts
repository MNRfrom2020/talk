import {
  clearDownloadedAudios,
} from "./idb";

const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const DRIVE_FILE_NAME = "mnr-talk-backup.json";
const BACKUP_SETTINGS_KEY = "mnr_google_drive_backup_settings";
const SESSION_ACCESS_TOKEN_KEY = "mnr_google_drive_access_token";
const SESSION_ACCESS_TOKEN_EXPIRY_KEY = "mnr_google_drive_access_token_expiry";
const EXCLUDED_LOCAL_STORAGE_KEYS = new Set([BACKUP_SETTINGS_KEY]);

export type AutoBackupFrequency = "off" | "daily" | "weekly";

export type GoogleDriveBackupSettings = {
  connected: boolean;
  autoBackupFrequency: AutoBackupFrequency;
  backupFileId?: string;
  lastBackupAt?: string;
  lastRestoreAt?: string;
};

type BackupPayload = {
  version: 1;
  exportedAt: string;
  localStorage: Record<string, string>;
};

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

const getClientId = () => import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || "";

const defaultSettings: GoogleDriveBackupSettings = {
  connected: false,
  autoBackupFrequency: "off",
};

let scriptLoadingPromise: Promise<void> | null = null;

export const isGoogleDriveBackupConfigured = () => !!getClientId();

export const getGoogleDriveBackupSettings = (): GoogleDriveBackupSettings => {
  try {
    const raw = localStorage.getItem(BACKUP_SETTINGS_KEY);
    if (!raw) {
      return defaultSettings;
    }

    return {
      ...defaultSettings,
      ...(JSON.parse(raw) as Partial<GoogleDriveBackupSettings>),
    };
  } catch {
    return defaultSettings;
  }
};

export const saveGoogleDriveBackupSettings = (
  nextSettings: Partial<GoogleDriveBackupSettings>,
) => {
  const merged = {
    ...getGoogleDriveBackupSettings(),
    ...nextSettings,
  };

  localStorage.setItem(BACKUP_SETTINGS_KEY, JSON.stringify(merged));
  return merged;
};

export const disconnectGoogleDriveBackup = () => {
  sessionStorage.removeItem(SESSION_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_ACCESS_TOKEN_EXPIRY_KEY);
  return saveGoogleDriveBackupSettings({
    connected: false,
    backupFileId: undefined,
  });
};

const loadGoogleIdentityScript = async () => {
  if (typeof window === "undefined") return;
  if (window.google?.accounts?.oauth2) return;

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_SCRIPT_SRC}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Failed to load Google Identity Services.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Failed to load Google Identity Services."));
      document.head.appendChild(script);
    });
  }

  await scriptLoadingPromise;
};

const storeSessionAccessToken = (response: TokenResponse) => {
  if (!response.access_token) {
    throw new Error(response.error_description || "Google access token missing.");
  }

  sessionStorage.setItem(SESSION_ACCESS_TOKEN_KEY, response.access_token);

  if (response.expires_in) {
    sessionStorage.setItem(
      SESSION_ACCESS_TOKEN_EXPIRY_KEY,
      String(Date.now() + response.expires_in * 1000),
    );
  }

  return response.access_token;
};

const getSessionAccessToken = () => {
  const token = sessionStorage.getItem(SESSION_ACCESS_TOKEN_KEY);
  const expiry = Number(sessionStorage.getItem(SESSION_ACCESS_TOKEN_EXPIRY_KEY) || "0");

  if (!token) return null;
  if (!expiry || Date.now() < expiry - 60_000) {
    return token;
  }

  sessionStorage.removeItem(SESSION_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_ACCESS_TOKEN_EXPIRY_KEY);
  return null;
};

const requestAccessToken = async (prompt: "" | "consent select_account") => {
  await loadGoogleIdentityScript();

  const clientId = getClientId();
  if (!clientId) {
    throw new Error("Missing VITE_GOOGLE_CLIENT_ID.");
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        resolve(storeSessionAccessToken(response));
      },
      error_callback: () => reject(new Error("Google sign-in was cancelled.")),
    });

    if (!tokenClient) {
      reject(new Error("Google Identity Services failed to initialize."));
      return;
    }

    tokenClient.requestAccessToken({ prompt });
  });
};

export const getGoogleDriveAccessToken = async (interactive = false) => {
  const existingToken = getSessionAccessToken();
  if (existingToken) {
    return existingToken;
  }

  const settings = getGoogleDriveBackupSettings();
  if (!interactive && !settings.connected) {
    return null;
  }

  try {
    return await requestAccessToken(interactive ? "consent select_account" : "");
  } catch (error) {
    if (!interactive) {
      return null;
    }
    throw error;
  }
};

const driveFetch = async (
  input: string,
  init: RequestInit = {},
  accessToken?: string,
) => {
  const token = accessToken || (await getGoogleDriveAccessToken(true));
  if (!token) {
    throw new Error("Google Drive is not connected.");
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Google Drive request failed.");
  }

  return response;
};

const findBackupFileId = async (accessToken: string) => {
  const settings = getGoogleDriveBackupSettings();
  if (settings.backupFileId) {
    return settings.backupFileId;
  }

  const query = encodeURIComponent(
    `name='${DRIVE_FILE_NAME}' and 'appDataFolder' in parents and trashed=false`,
  );
  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=appDataFolder&fields=files(id,name)`,
    {},
    accessToken,
  );
  const data = (await response.json()) as { files?: Array<{ id: string }> };
  const fileId = data.files?.[0]?.id;

  if (fileId) {
    saveGoogleDriveBackupSettings({ backupFileId: fileId });
  }

  return fileId;
};

const getBackupPayload = async (): Promise<BackupPayload> => {
  const localStorageSnapshot: Record<string, string> = {};

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) {
      continue;
    }

    if (EXCLUDED_LOCAL_STORAGE_KEYS.has(key)) {
      continue;
    }

    const value = localStorage.getItem(key);
    if (value !== null) {
      localStorageSnapshot[key] = value;
    }
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    localStorage: localStorageSnapshot,
  };
};

const replaceLocalAppData = async (payload: BackupPayload) => {
  const incomingLocalStorage = payload.localStorage || {};

  for (const key of Object.keys(localStorage)) {
    if (EXCLUDED_LOCAL_STORAGE_KEYS.has(key)) {
      continue;
    }
    localStorage.removeItem(key);
  }

  Object.entries(incomingLocalStorage).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });

  await clearDownloadedAudios();
};

export const connectGoogleDriveBackup = async () => {
  const accessToken = await getGoogleDriveAccessToken(true);
  saveGoogleDriveBackupSettings({ connected: true });
  return accessToken;
};

export const uploadBackupToGoogleDrive = async (existingAccessToken?: string) => {
  const accessToken = existingAccessToken || (await getGoogleDriveAccessToken(true));
  if (!accessToken) {
    throw new Error("Google Drive connection required.");
  }

  const payload = await getBackupPayload();
  const fileId = await findBackupFileId(accessToken);
  const metadata = fileId
    ? {
        name: DRIVE_FILE_NAME,
        mimeType: "application/json",
      }
    : {
        name: DRIVE_FILE_NAME,
        parents: ["appDataFolder"],
        mimeType: "application/json",
      };

  const boundary = `mnr-backup-${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    `${JSON.stringify(payload)}\r\n` +
    `--${boundary}--`;

  const endpoint = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  const method = fileId ? "PATCH" : "POST";

  const response = await driveFetch(
    endpoint,
    {
      method,
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
    accessToken,
  );

  const result = (await response.json()) as { id?: string };
  const lastBackupAt = new Date().toISOString();

  saveGoogleDriveBackupSettings({
    connected: true,
    backupFileId: result.id || fileId,
    lastBackupAt,
  });

  return { lastBackupAt };
};

export const restoreBackupFromGoogleDrive = async () => {
  const accessToken = await getGoogleDriveAccessToken(true);
  if (!accessToken) {
    throw new Error("Google Drive connection required.");
  }

  const fileId = await findBackupFileId(accessToken);
  if (!fileId) {
    throw new Error("No backup file found in your Google Drive.");
  }

  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {},
    accessToken,
  );
  const payload = (await response.json()) as BackupPayload;

  if (!payload || payload.version !== 1) {
    throw new Error("Backup file format is not supported.");
  }

  await replaceLocalAppData(payload);

  const lastRestoreAt = new Date().toISOString();
  saveGoogleDriveBackupSettings({
    connected: true,
    backupFileId: fileId,
    lastRestoreAt,
  });

  return { lastRestoreAt };
};

const intervalToMs: Record<Exclude<AutoBackupFrequency, "off">, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export const shouldRunAutoBackup = (settings: GoogleDriveBackupSettings) => {
  if (settings.autoBackupFrequency === "off") {
    return false;
  }

  if (!settings.lastBackupAt) {
    return true;
  }

  const lastBackup = new Date(settings.lastBackupAt).getTime();
  if (Number.isNaN(lastBackup)) {
    return true;
  }

  return Date.now() - lastBackup >= intervalToMs[settings.autoBackupFrequency];
};

export const maybeRunSilentAutoBackup = async () => {
  const settings = getGoogleDriveBackupSettings();
  if (!settings.connected || !shouldRunAutoBackup(settings)) {
    return { ran: false };
  }

  const token = await getGoogleDriveAccessToken(false);
  if (!token) {
    return { ran: false };
  }

  const result = await uploadBackupToGoogleDrive(token);
  return { ran: true, ...result };
};
