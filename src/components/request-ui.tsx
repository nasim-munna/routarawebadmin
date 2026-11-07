"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { post } from "@/lib/api";
import { Button, Dialog, ErrorNote, Field, Input } from "./ui";

/** Approve and Reject for a pending leave request or expense. Staff can't
 * decide their own, so the API refuses those and the message shows here. */
export function DecisionButtons({ path, id, subject }: { path: string; id: number; subject: string }) {
  const client = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const decide = useMutation({
    mutationFn: (action: "approve" | "reject") => post(`${path}/${id}/${action}`, action === "reject" ? { reason } : undefined),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [path] });
      setRejecting(false);
    },
  });

  return (
    <span className="flex justify-end gap-2">
      {!rejecting && decide.error != null && (
        <Dialog title="Couldn't do that" onClose={() => decide.reset()}>
          <ErrorNote error={decide.error} />
        </Dialog>
      )}
      <Button disabled={decide.isPending} onClick={() => setRejecting(true)}>
        Reject
      </Button>
      <Button variant="primary" busy={decide.isPending} onClick={() => decide.mutate("approve")}>
        Approve
      </Button>
      {rejecting && (
        <Dialog title={`Reject ${subject}`} onClose={() => setRejecting(false)}>
          <form
            className="space-y-4 text-left"
            onSubmit={(event) => {
              event.preventDefault();
              decide.mutate("reject");
            }}
          >
            {decide.error != null && <ErrorNote error={decide.error} />}
            <Field label="Reason">
              <Input required maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setRejecting(false)}>
                Back
              </Button>
              <Button type="submit" variant="danger" busy={decide.isPending}>
                Reject
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </span>
  );
}
