import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "ghost" | "subtle";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary: "bg-emerald-400 text-black hover:bg-emerald-300",
  ghost: "bg-white/10 hover:bg-white/20 text-white",
  subtle: "bg-white text-black hover:bg-white/90",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-2 text-sm rounded-xl",
  md: "px-4 py-2.5 text-sm rounded-2xl",
};

export function Button({
  className = "",
  children,
  ...props
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & { variant?: Variant; size?: Size }) {
  const variant = (props as any).variant ?? "ghost";
  const size = (props as any).size ?? "md";
  // @ts-ignore - we consume these so they don't land on the DOM element
  delete (props as any).variant;
  delete (props as any).size;

  return (
    <button
      className={[
        "inline-flex items-center gap-2 font-medium transition-colors",
        VARIANT[variant], SIZE[size], className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
