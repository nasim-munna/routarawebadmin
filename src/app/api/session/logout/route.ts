import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_ORIGIN, clearRefreshCookie, REFRESH_COOKIE } from "@/lib/session-cookie";

export async function POST() {
  const refresh = (await cookies()).get(REFRESH_COOKIE)?.value;

  if (refresh) {
    await fetch(`${API_ORIGIN}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    }).catch(() => {});
  }

  const response = NextResponse.json({ ok: true });
  clearRefreshCookie(response);
  return response;
}
