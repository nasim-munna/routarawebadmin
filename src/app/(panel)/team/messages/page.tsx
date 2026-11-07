"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, Dialog, Empty, ErrorNote, Input, PageHeader, Select, Skeleton } from "@/components/ui";
import { api, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ago, fullName, time } from "@/lib/format";
import type { ChatMessage, Conversation, Page, Person } from "@/lib/types";

const REFRESH_MS = 5000;

const nameOf = (conversation: Conversation) => (conversation.otherParticipant ? fullName(conversation.otherParticipant) : (conversation.name ?? "Conversation"));

function NewChat({ onStarted, onClose }: { onStarted: (conversation: Conversation) => void; onClose: () => void }) {
  const [person, setPerson] = useState("");
  const people = useQuery({ queryKey: ["chat-people"], queryFn: () => api<Page<Person>>("/user/others?size=100") });
  const start = useMutation({
    mutationFn: () => post<Conversation>(`/conversation/start/${person}`),
    onSuccess: onStarted,
  });

  return (
    <Dialog title="New message" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          start.mutate();
        }}
      >
        {start.error != null && <ErrorNote error={start.error} />}
        <Select aria-label="Person" required value={person} onChange={(event) => setPerson(event.target.value)}>
          <option value="">Choose a person…</option>
          {people.data?.results
            .filter((row) => row.role !== "DISTRIBUTOR")
            .map((row) => (
              <option key={row.id} value={row.id}>
                {fullName(row)}
              </option>
            ))}
        </Select>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={start.isPending}>
            Start
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function Thread({ conversation, myId }: { conversation: Conversation; myId: number }) {
  const client = useQueryClient();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const path = `/conversation/${conversation.id}/messages`;

  const messages = useQuery({
    queryKey: [path],
    queryFn: () => api<Page<ChatMessage>>(`${path}?latest=true&size=100`),
    refetchInterval: REFRESH_MS,
  });
  const rows = [...(messages.data?.results ?? [])].reverse();
  const newest = rows.at(-1)?.id;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
    if (newest !== undefined) post(`/conversation/${conversation.id}/seen`).catch(() => {});
  }, [newest, conversation.id]);

  const send = useMutation({
    mutationFn: () => post(path, { message: text }),
    onSuccess: () => {
      setText("");
      client.invalidateQueries({ queryKey: [path] });
      client.invalidateQueries({ queryKey: ["/conversation"] });
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="border-b border-line px-5 py-3 font-semibold">{nameOf(conversation)}</p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {messages.error != null && <ErrorNote error={messages.error} />}
        {rows.map((row) => (
          <div key={row.id} className={clsx("flex", row.sender === myId ? "justify-end" : "justify-start")}>
            <div className={clsx("max-w-[80%] rounded-2xl px-3 py-2 text-sm", row.sender === myId ? "bg-brand text-white" : "bg-surface-2")}>
              <p className="break-words whitespace-pre-wrap">{row.message}</p>
              <p className={clsx("mt-0.5 text-xs", row.sender === myId ? "text-white/75" : "text-ink-2")}>{time(row.createdAt)}</p>
            </div>
          </div>
        ))}
        {messages.isSuccess && rows.length === 0 && <Empty title="No messages yet" hint="Say hello." />}
        <div ref={end} />
      </div>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim()) send.mutate();
        }}
      >
        <Input aria-label="Message" placeholder="Write a message" maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} />
        <Button type="submit" variant="primary" aria-label="Send" busy={send.isPending} disabled={!text.trim()}>
          <Send className="size-4" aria-hidden="true" />
        </Button>
      </form>
      {send.error != null && <ErrorNote error={send.error} />}
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [open, setOpen] = useState<Conversation | null>(null);
  const [adding, setAdding] = useState(false);

  const list = useQuery({
    queryKey: ["/conversation"],
    queryFn: () => api<Page<Conversation>>("/conversation?size=100"),
    refetchInterval: REFRESH_MS * 2,
  });

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-6xl flex-col p-4 md:h-dvh md:p-8">
      <PageHeader title="Messages" subtitle="Talk to your team">
        <Button variant="primary" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden="true" />
          New message
        </Button>
      </PageHeader>

      {list.error != null && <ErrorNote error={list.error} onRetry={() => list.refetch()} />}
      {list.isPending && <Skeleton className="h-80" />}

      {list.data && (
        <Card className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[18rem_1fr]">
          <ul className={clsx("min-h-0 overflow-y-auto border-line md:border-r", open && "hidden md:block")}>
            {list.data.results.map((row) => (
              <li key={row.id}>
                <button
                  onClick={() => setOpen(row)}
                  className={clsx("w-full border-b border-line px-4 py-3 text-left hover:bg-surface-2", open?.id === row.id && "bg-surface-2")}
                >
                  <span className="block truncate font-semibold">{nameOf(row)}</span>
                  <span className="block truncate text-sm text-ink-2">{row.lastMessage?.message ?? "No messages yet"}</span>
                  {row.lastMessage && <span className="block text-xs text-ink-3">{ago(row.lastMessage.createdAt)}</span>}
                </button>
              </li>
            ))}
            {list.data.results.length === 0 && <Empty title="No conversations yet" />}
          </ul>
          <div className={clsx("min-h-0", !open && "hidden md:block")}>
            {open && user ? (
              <>
                <button onClick={() => setOpen(null)} className="px-4 pt-3 text-sm font-semibold text-brand md:hidden">
                  Back
                </button>
                <Thread key={open.id} conversation={open} myId={user.id} />
              </>
            ) : (
              <Empty title="Choose a conversation" />
            )}
          </div>
        </Card>
      )}

      {adding && (
        <NewChat
          onClose={() => setAdding(false)}
          onStarted={(conversation) => {
            setAdding(false);
            setOpen(conversation);
            client.invalidateQueries({ queryKey: ["/conversation"] });
          }}
        />
      )}
    </div>
  );
}
