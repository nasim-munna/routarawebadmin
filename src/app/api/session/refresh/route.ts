import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_ORIGIN, clearRefreshCookie, REFRESH_COOKIE, setRefreshCookie } from "@/lib/session-cookie";

export async function POST() {
  const refresh = (await cookies()).get(REFRESH_COOKIE)?.value;
  if (!refresh) return NextResponse.json({ message: "Not signed in." }, { status: 401 });

  let upstream: Response;
  try {
    upstream = await fetch(`${API_ORIGIN}/api/v1/auth/token/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
  } catch {
    // An outage isn't a rejected session: keep the cookie so a retry can work.
    return NextResponse.json({ message: "The server can't be reached right now." }, { status: 503 });
  }

  if (!upstream.ok) {
    const response = NextResponse.json({ message: "Session ended." }, { status: 401 });
    clearRefreshCookie(response);
    return response;
  }

  const tokens = await upstream.json();
  const response = NextResponse.json({ accessToken: tokens.access });
  if (tokens.refresh) setRefreshCookie(response, tokens.refresh);
  return response;
}
