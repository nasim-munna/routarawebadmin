"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { api, getAccessToken, refreshAccessToken } from "./api";
import type { LivePosition } from "./types";

const WS_ORIGIN = process.env.NEXT_PUBLIC_WS_ORIGIN ?? "ws://localhost:8000";
const AUTH_REJECTED = 4401;

export type SocketState = "connecting" | "live" | "down";

/**
 * Positions from the API plus whatever arrives on /ws/tracking/ afterwards.
 * The periodic refetch corrects anything the socket can't tell us, such as
 * someone who has gone quiet.
 */
export function useLivePositions() {
  const query = useQuery({
    queryKey: ["live"],
    queryFn: () => api<LivePosition[]>("/location/live"),
    refetchInterval: 60_000,
  });

  const [pings, setPings] = useState<Record<number, LivePosition>>({});
  const [socketState, setSocketState] = useState<SocketState>("connecting");

  useEffect(() => {
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    let stopped = false;

    async function connect() {
      const token = getAccessToken() ?? (await refreshAccessToken());
      if (stopped || !token) return;

      socket = new WebSocket(`${WS_ORIGIN}/ws/tracking/?token=${encodeURIComponent(token)}`);

      socket.onopen = () => {
        attempts = 0;
        setSocketState("live");
      };

      socket.onmessage = (event) => {
        const ping = JSON.parse(event.data) as LivePosition;
        setPings((current) => ({ ...current, [ping.userId]: ping }));
      };

      socket.onclose = async (event) => {
        if (stopped) return;
        setSocketState("down");
        if (event.code === AUTH_REJECTED) await refreshAccessToken();
        attempts += 1;
        timer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempts));
      };
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(timer);
      socket?.close();
    };
  }, []);

  const positions = useMemo(() => {
    const merged = new Map((query.data ?? []).map((row) => [row.userId, row]));

    for (const ping of Object.values(pings)) {
      const known = merged.get(ping.userId);
      if (!known || ping.syncTime > known.syncTime) {
        merged.set(ping.userId, { ...known, ...ping, isLive: true, status: "ONLINE" });
      }
    }
    return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [query.data, pings]);

  return { positions, socketState, error: query.error, isPending: query.isPending, refetch: query.refetch };
}
