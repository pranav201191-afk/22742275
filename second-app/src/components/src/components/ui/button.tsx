import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

export function Button({ className = "", children, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
