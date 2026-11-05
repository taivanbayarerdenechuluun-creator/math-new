"use client";
// MathLive дээр суурилсан математикийн засварлагч (LaTeX гаралт, виртуал гар).
import * as React from "react";
import { Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { placeholder?: string };
    }
  }
}
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { placeholder?: string };
    }
  }
}

interface MathFieldEl extends HTMLElement {
  value: string;
  getValue(format?: string): string;
  setValue(v: string): void;
  focus(): void;
  mathVirtualKeyboardPolicy: string;
  smartMode: boolean;
}

let configured = false;

export function MathEditor({
  value,
  onChange,
  placeholder,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (latex: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const ref = React.useRef<MathFieldEl | null>(null);
  const [ready, setReady] = React.useState(false);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => {
    let cancelled = false;
    import("mathlive").then((ml) => {
      if (cancelled) return;
      if (!configured) {
        ml.MathfieldElement.fontsDirectory = "/mathlive/fonts";
        ml.MathfieldElement.soundsDirectory = null;
        configured = true;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;
    el.mathVirtualKeyboardPolicy = "manual";
    el.smartMode = false;
    const handler = () => onChangeRef.current(el.getValue("latex"));
    el.addEventListener("input", handler);
    if (autoFocus) setTimeout(() => el.focus(), 50);
    return () => el.removeEventListener("input", handler);
  }, [ready, autoFocus]);

  // Гаднаас утга өөрчлөгдвөл синк хийх (жишээ нь OCR-ийн үр дүн)
  React.useEffect(() => {
    const el = ref.current;
    if (ready && el && el.getValue("latex") !== value) el.setValue(value);
  }, [value, ready]);

  const toggleKeyboard = () => {
    const kb = (window as unknown as { mathVirtualKeyboard?: { visible: boolean; show: () => void; hide: () => void } }).mathVirtualKeyboard;
    ref.current?.focus();
    if (kb) (kb.visible ? kb.hide() : kb.show());
  };

  return (
    <div className={cn("relative", className)}>
      {!ready && <div className="skeleton h-[54px] rounded-xl" />}
      <div className={cn(!ready && "hidden")}>
        <math-field ref={ref as unknown as React.Ref<HTMLElement>} placeholder={placeholder} aria-label="Математик илэрхийлэл оруулах талбар" />
      </div>
      {ready && (
        <button
          type="button"
          onClick={toggleKeyboard}
          className="absolute right-12 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-subtle hover:bg-surface-2 hover:text-fg"
          aria-label="Математик гар"
          title="Математик гар"
        >
          <Keyboard className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
