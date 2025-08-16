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

export interface ButtonProps
  extends PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className = "",
  children,
  variant = "ghost",
  size = "md",
  ...props
}: ButtonProps) {
  const variantClass = VARIANT[variant];
  const sizeClass = SIZE[size];

  return (
    <button
      className={[
        "inline-flex items-center gap-2 font-medium transition-colors",
        variantClass,
        sizeClass,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
