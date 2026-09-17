"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { collectNowAction } from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";

export function CollectNowButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function collect() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await collectNowAction();
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Coleta concluída.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" disabled={pending} onClick={collect}>
        {pending ? (
          <>
            <Loader2 data-icon="inline-start" className="animate-spin" />
            Coletando…
          </>
        ) : (
          "Coletar agora"
        )}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
          <div className="mx-4 flex max-w-sm flex-col items-center gap-3 rounded-xl bg-card px-8 py-6 text-center shadow-lg ring-1 ring-foreground/10">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="font-medium">Coletando feedbacks…</p>
            <p className="text-sm text-muted-foreground">
              Aguarde. Isso pode levar alguns minutos.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
