"use client";
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Moon, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-navy/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn("relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-border bg-surface shadow-float sm:rounded-3xl", width)}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <button onClick={onClose} className="rounded-lg p-1 text-subtle hover:bg-surface-2 hover:text-fg" aria-label="Хаах">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1", className)} role="tablist">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              active ? "text-fg" : "text-muted hover:text-fg",
            )}
          >
            {active && <motion.span layoutId={`tab-${tabs.map((x) => x.value).join("")}`} className="absolute inset-0 rounded-lg bg-surface shadow-soft" transition={{ type: "spring", damping: 30, stiffness: 400 }} />}
            <span className="relative flex items-center gap-2">
              {t.icon}
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = React.useState<boolean | null>(null);
  React.useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("iqm-theme", next ? "dark" : "light");
    } catch {
      /* хувийн горимд localStorage хаалттай байж болно */
    }
    setDark(next);
  };
  return (
    <button
      onClick={toggle}
      className={cn("grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg", className)}
      aria-label={dark ? "Цайвар горим" : "Бараан горим"}
      title={dark ? "Цайвар горим" : "Бараан горим"}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}

/** Устгах гэх мэт эргэлт буцалтгүй үйлдлийг баталгаажуулах */
export function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmLabel = "Тийм",
  children,
  className,
}: {
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: string;
  confirmLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      <span className={className} onClick={() => setOpen(true)}>
        {children}
      </span>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        size="sm"
        footer={
          <>
            <button className="h-10 rounded-xl px-4 text-sm font-semibold text-muted hover:bg-surface-2" onClick={() => setOpen(false)}>
              Болих
            </button>
            <button
              className="h-10 rounded-xl bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirmLabel}
            </button>
          </>
        }
      />
    </>
  );
}
