import { NextResponse } from "next/server";
import { API_ORIGIN, setRefreshCookie } from "@/lib/session-cookie";

export async function POST(request: Request) {
  const credentials = await request.json().catch(() => null);
  if (!credentials?.email || !credentials?.password) {
    return NextResponse.json({ message: "Enter your email and password." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
    });
  } catch {
    return NextResponse.json({ message: "The server can't be reached right now." }, { status: 503 });
  }

  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    const message = upstream.status === 401 ? "That email or password isn't right." : payload?.message;
    return NextResponse.json({ message: message ?? "Could not sign in." }, { status: upstream.status });
  }

  const { accessToken, refreshToken, role } = payload.data;
  if (role === "EMPLOYEE") {
    return NextResponse.json(
      { message: "This panel is for managers and admins. Please use the mobile app." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ accessToken });
  setRefreshCookie(response, refreshToken);
  return response;
}
