"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DropdownMenuContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const context = React.useContext(DropdownMenuContext);

  if (!context) {
    throw new Error("DropdownMenu components must be used inside <DropdownMenu>.");
  }

  return context;
}

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={rootRef} className="relative inline-flex">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

type DropdownMenuTriggerProps = {
  asChild?: boolean;
  children: React.ReactElement<{
    onClick?: React.MouseEventHandler;
    [key: string]: unknown;
  }>;
};

export function DropdownMenuTrigger({
  asChild = false,
  children,
}: DropdownMenuTriggerProps) {
  const { open, setOpen } = useDropdownMenuContext();

  const handleClick: React.MouseEventHandler = (event) => {
    children.props.onClick?.(event);
    if (!event.defaultPrevented) {
      setOpen(!open);
    }
  };

  if (asChild) {
    return React.cloneElement(children, {
      "aria-expanded": open,
      "aria-haspopup": "menu",
      onClick: handleClick,
    });
  }

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

type DropdownMenuContentProps = React.HTMLAttributes<HTMLDivElement>;

export function DropdownMenuContent({
  className,
  children,
  ...props
}: DropdownMenuContentProps) {
  const { open } = useDropdownMenuContext();

  if (!open) {
    return null;
  }

  return (
    <div
      role="menu"
      className={cn(
        "absolute right-0 top-full z-50 mt-2 min-w-52 overflow-hidden rounded-xl border border-slate-200/70 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type DropdownMenuItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  inset?: boolean;
};

export function DropdownMenuItem({
  className,
  children,
  onClick,
  inset = false,
  ...props
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownMenuContext();

  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white",
        inset && "pl-8",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(false);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("my-1 h-px bg-slate-200 dark:bg-slate-800", className)}
      {...props}
    />
  );
}
