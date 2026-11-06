import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  targetName?: string | undefined;
  targetItem?: string | undefined;
  targetType?: "user" | "meeting" | "record" | undefined;
  description?: string | undefined;
  confirmLabel?: string | undefined;
  deleteLabel?: string | undefined;
  cancelLabel?: string | undefined;
  onConfirm: () => Promise<void> | void;
  loading?: boolean | undefined;
  isDeleting?: boolean | undefined;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  targetName,
  targetItem,
  targetType = "record",
  description,
  confirmLabel,
  deleteLabel,
  cancelLabel = "Cancel",
  onConfirm,
  loading = false,
  isDeleting = false,
}: ConfirmDeleteDialogProps) {
  const effectiveTarget = targetItem || targetName;
  const effectiveConfirmLabel = deleteLabel || confirmLabel || "Delete";
  const effectiveLoading = isDeleting || loading;

  const defaultDesc =
    targetType === "user"
      ? "This action will permanently delete this user account and associated meeting records. This action cannot be undone."
      : targetType === "meeting"
        ? "This will permanently remove the audio recording, searchable transcript, executive summary, and action items. This action cannot be undone."
        : "This action cannot be undone and will permanently remove this item.";

  return (
    <AlertDialog open={open} onOpenChange={effectiveLoading ? () => {} : onOpenChange}>
      <AlertDialogContent className="max-w-[440px] rounded-2xl p-6 shadow-2xl border-border bg-card">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <AlertDialogTitle className="text-base font-semibold text-foreground">
                {title}
              </AlertDialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanent Deletion Confirmation
              </p>
            </div>
          </div>

          <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground space-y-2">
            {effectiveTarget && (
              <span className="block rounded-lg border border-border/80 bg-muted/40 px-3 py-2 font-mono text-xs text-foreground font-medium break-all">
                {effectiveTarget}
              </span>
            )}
            <span className="block pt-1">{description || defaultDesc}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-5 gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={effectiveLoading}
            className="rounded-xl text-xs h-9 font-medium"
          >
            {cancelLabel}
          </AlertDialogCancel>

          <AlertDialogAction
            disabled={effectiveLoading}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            className={cn(
              buttonVariants({ variant: "destructive" }),
              "rounded-xl text-xs h-9 font-medium shadow-xs gap-1.5",
            )}
          >
            {effectiveLoading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>{effectiveConfirmLabel}</span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
