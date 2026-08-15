import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CONFIRM_TEXT = "DELETE";

async function invokeDeleteAccount() {
  const { data, error } = await supabase.functions.invoke("delete-account", {
    method: "POST",
    body: {},
  });

  if (!error) {
    return { ok: true, data };
  }

  let status = 500;
  let message = error.message || "Could not delete account";

  const response = error.context;
  if (response instanceof Response) {
    status = response.status;
    try {
      const body = await response.clone().json();
      if (typeof body?.error === "string" && body.error) {
        message = body.error;
      }
    } catch {
      // use default message
    }
  }

  return { ok: false, status, message };
}

/**
 * Destructive account deletion UI — calls delete-account edge function only.
 */
export default function AccountDeletionSection({ className = "" }) {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [blockingError, setBlockingError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const resetDialog = () => {
    setConfirmText("");
    setBlockingError("");
    setIsDeleting(false);
  };

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetDialog();
    }
  };

  const handleConfirmDelete = async () => {
    if (confirmText !== CONFIRM_TEXT) return;

    setIsDeleting(true);
    setBlockingError("");

    try {
      const result = await invokeDeleteAccount();

      if (!result.ok) {
        if (result.status === 409) {
          setBlockingError(result.message);
          setIsDeleting(false);
          return;
        }
        setBlockingError(result.message);
        setIsDeleting(false);
        return;
      }

      setOpen(false);
      resetDialog();
      await signOut();
    } catch (err) {
      console.error("Delete account error:", err);
      setBlockingError(
        err instanceof Error ? err.message : "Failed to delete account"
      );
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card
        className={`border-red-500/40 bg-red-950/20 shadow-xl ${className}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            Delete account
          </CardTitle>
          <CardDescription className="text-red-200/80">
            Permanently remove your Skills account. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Delete your account permanently?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground pt-1">
                <p>
                  This action is <strong>permanent</strong>. Your account
                  cannot be recovered after deletion.
                </p>
                <p>
                  Past booking records are kept in anonymized form for financial
                  and legal purposes, but your personal information will be
                  removed from the app.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {blockingError ? (
              <p
                className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3"
                role="alert"
              >
                {blockingError}
              </p>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <span className="font-mono font-semibold">{CONFIRM_TEXT}</span>{" "}
                to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_TEXT}
                autoComplete="off"
                disabled={isDeleting}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={confirmText !== CONFIRM_TEXT || isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete my account"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
