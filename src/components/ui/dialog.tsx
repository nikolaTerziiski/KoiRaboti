"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type DismissEventLike = {
  preventDefault: () => void;
};

type DialogContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preventClose: boolean;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);

  if (!context) {
    throw new Error("Dialog components must be used inside <Dialog>.");
  }

  return context;
}

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preventClose?: boolean;
  children: React.ReactNode;
};

export function Dialog({
  open,
  onOpenChange,
  preventClose = false,
  children,
}: DialogProps) {
  React.useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <DialogContext.Provider value={{ open, onOpenChange, preventClose }}>
      {children}
    </DialogContext.Provider>
  );
}

type DialogTriggerProps = {
  asChild?: boolean;
  children: React.ReactElement<{
    onClick?: React.MouseEventHandler;
    [key: string]: unknown;
  }>;
};

export function DialogTrigger({
  asChild = false,
  children,
}: DialogTriggerProps) {
  const { onOpenChange } = useDialogContext();

  const handleClick: React.MouseEventHandler = (event) => {
    children.props.onClick?.(event);
    if (!event.defaultPrevented) {
      onOpenChange(true);
    }
  };

  if (asChild) {
    return React.cloneElement(children, {
      "aria-haspopup": "dialog",
      onClick: handleClick,
    });
  }

  return (
    <button type="button" aria-haspopup="dialog" onClick={handleClick}>
      {children}
    </button>
  );
}

type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  showClose?: boolean;
  onClose?: () => void;
  onPointerDownOutside?: (event: DismissEventLike) => void;
  onEscapeKeyDown?: (event: DismissEventLike) => void;
};

export function DialogContent({
  className,
  children,
  showClose = false,
  onClose,
  onPointerDownOutside,
  onEscapeKeyDown,
  ...props
}: DialogContentProps) {
  const { open, onOpenChange, preventClose } = useDialogContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      let defaultPrevented = false;
      onEscapeKeyDown?.({
        preventDefault: () => {
          defaultPrevented = true;
        },
      });

      if (preventClose || defaultPrevented) {
        event.preventDefault();
        return;
      }

      onOpenChange(false);
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onEscapeKeyDown, onOpenChange, preventClose]);

  if (!mounted || !open) {
    return null;
  }

  function handleBackdropClick() {
    let defaultPrevented = false;
    onPointerDownOutside?.({
      preventDefault: () => {
        defaultPrevented = true;
      },
    });

    if (preventClose || defaultPrevented) {
      return;
    }

    onOpenChange(false);
  }

  function handleCloseClick() {
    if (onClose) {
      onClose();
      return;
    }

    onOpenChange(false);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className={cn(
          "absolute inset-0 bg-slate-950/70 backdrop-blur-sm",
          preventClose && "cursor-default",
        )}
        onClick={handleBackdropClick}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900",
          className,
        )}
        {...props}
      >
        {showClose ? (
          <button
            type="button"
            aria-label="Close"
            onClick={handleCloseClick}
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="size-4" />
          </button>
        ) : null}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 space-y-1", className)} {...props} />;
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-lg font-semibold tracking-tight text-slate-900 dark:text-white",
        className,
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-slate-500 dark:text-slate-400", className)}
      {...props}
    />
  );
}
