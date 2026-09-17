"use client";

import { LoginForm } from "@/components/auth/auth-forms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LoginDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-zinc-950 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Entrar no Radar AI</DialogTitle>
          <DialogDescription>
            Use o e-mail da sua conta BMG Tech AI.
          </DialogDescription>
        </DialogHeader>
        <LoginForm />
      </DialogContent>
    </Dialog>
  );
}
