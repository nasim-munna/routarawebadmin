import type { NextResponse } from "next/server";

export const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8000";
export const REFRESH_COOKIE = "routara_refresh";

const YEAR_SECONDS = 60 * 60 * 24 * 365;

export function setRefreshCookie(response: NextResponse, token: string) {
  response.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api/session",
    maxAge: YEAR_SECONDS,
  });
}

export function clearRefreshCookie(response: NextResponse) {
  response.cookies.set(REFRESH_COOKIE, "", { path: "/api/session", maxAge: 0 });
}
