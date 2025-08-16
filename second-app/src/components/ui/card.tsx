import type { HTMLAttributes, PropsWithChildren } from "react";

export function Card({ className = "", children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/10 bg-white/5",
        "shadow-[0_10px_30px_rgba(0,0,0,0.25)]",
        "backdrop-blur-md transition-transform",
        "hover:-translate-y-0.5",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={["p-6 md:p-8", className].join(" ")} {...props}>
      {children}
    </div>
  );
}
