import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((options?: ConfirmOptions | string): Promise<boolean> => {
    const resolved: ConfirmOptions = typeof options === 'string'
      ? { description: options }
      : (options ?? {});
    setOpts(resolved);
    setOpen(true);
    return new Promise(res => { resolveRef.current = res; });
  }, []);

  function handleConfirm() {
    setOpen(false);
    resolveRef.current?.(true);
  }

  function handleCancel() {
    setOpen(false);
    resolveRef.current?.(false);
  }

  const dialog = (
    <Dialog open={open} onOpenChange={v => { if (!v) handleCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{opts.title ?? "Confirm Delete"}</DialogTitle>
          <DialogDescription>
            {opts.description ?? "Are you sure? This action cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>
            {opts.confirmLabel ?? "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
