import type { PropsWithChildren, HTMLAttributes } from "react";

type TabsProps = PropsWithChildren<{ value: string; onValueChange?: (v: string) => void; className?: string }>;
export function Tabs({ className = "", children }: TabsProps) {
  return <div className={className}>{children}</div>;
}

export function TabsList({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-wrap gap-2 ${className}`} {...props} />;
}

type TriggerProps = PropsWithChildren<{ value: string; className?: string; onClick?: () => void }>;
export function TabsTrigger({ className = "", children, onClick }: TriggerProps) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-xl text-sm bg-white/10 hover:bg-white/20 ${className}`}>
      {children}
    </button>
  );
}

type ContentProps = PropsWithChildren<{ value: string; className?: string }>;
export function TabsContent({ className = "", children }: ContentProps) {
  return <div className={className}>{children}</div>;
}
