import { useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  // Хуудсанд хэд хэдэн лого (нуугдсан sidebar г.м.) байх тул gradient id давхцахгүй байх ёстой
  const id = `iqm-g-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C62FF" />
          <stop offset="1" stopColor="#14C3E0" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${id})`} />
      {/* Σ ба язгуурын тэмдгийг хослуулсан тэмдэг */}
      <path d="M10 21.5l3.2 7.5L19 11h11" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="26.5" cy="23.5" r="4.2" stroke="white" strokeWidth="2.6" fill="none" />
      <path d="M29.4 26.6l2.6 2.8" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", className, compact = false }: { href?: string; className?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)} aria-label="IQ MATH нүүр">
      <LogoMark />
      {!compact && (
        <span className="font-display text-[1.05rem] font-semibold tracking-tight">
          IQ<span className="text-gradient"> MATH</span>
        </span>
      )}
    </Link>
  );
}
