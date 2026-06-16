const MNR_STATE_KEY = "mnr_oauth_state";

const CLIENT_ID = import.meta.env.VITE_MNR_CLIENT_ID as string;
const BASE_URL = import.meta.env.VITE_MNR_ID_URL as string;
const REDIRECT_URI = (import.meta.env.VITE_MNR_REDIRECT_URI || '').trim();

export interface MnrUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  username: string;
  role?: string;
  expired_at?: string | null; // Subscription/role expiry date
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Initiates the MNR ID OAuth flow.
 * Saves a random `state` in sessionStorage for CSRF validation,
 * then redirects the browser to the MNR ID authorization endpoint.
 */
export function startMnrIdLogin(): void {
  const state = generateState();
  localStorage.setItem(MNR_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
  });

  if (!BASE_URL || !CLIENT_ID || !REDIRECT_URI) {
    console.error("Missing MNR ID configuration in .env.local:", {
      BASE_URL,
      CLIENT_ID,
      REDIRECT_URI,
    });
    alert("MNR ID configuration missing. Check console for details.");
    return;
  }

  window.location.href = `${BASE_URL}/auth/authorize?${params.toString()}`;
}

/**
 * Exchanges the authorization code for user data.
 * Called in the /auth/callback page.
 *
 * @throws Error if state is invalid, or token exchange fails.
 */
export async function exchangeCodeForUser(
  code: string,
  returnedState: string,
): Promise<MnrUser> {
  // 1. Validate state (CSRF protection)
  const savedState = localStorage.getItem(MNR_STATE_KEY);
  localStorage.removeItem(MNR_STATE_KEY);

  if (!savedState || savedState !== returnedState) {
    throw new Error("Invalid state parameter. Possible CSRF attack.");
  }

  // 2. Exchange code via backend proxy (CORS safe + client secret safe)
  const response = await fetch("/api/auth_mnr.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    // Try to parse error as JSON first
    const text = await response.text();
    let errorData: any = {};
    try {
      errorData = text ? JSON.parse(text) : { error: `HTTP ${response.status}` };
    } catch {
      // If response is not JSON, use the status code
      errorData = { error: `Token exchange failed (${response.status})` };
    }
    throw new Error(
      errorData?.error || errorData?.message || `Token exchange failed (${response.status})`,
    );
  }

  // Debug: Log the raw response before parsing
  const responseText = await response.text();
  
  const user = JSON.parse(responseText);

  if (!user) {
    throw new Error("No user data received from MNR ID.");
  }

  return user as MnrUser;
}
