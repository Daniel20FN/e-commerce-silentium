"use client";
import Refresh from "@mui/icons-material/Refresh";
import { Button } from "@mui/material";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
export function RefreshPriorities({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outlined"
      startIcon={<Refresh />}
      disabled={pending}
      aria-busy={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
