import { type ReactNode } from "react";

interface Props {
  children: ReactNode;
  hcenter?: boolean;
  vcenter?: boolean;
  className?: string;
}

export default function Box({ children, hcenter, vcenter, className }: Props) {

  return (
    <div className={`bg-(--rcolor-highlight) p-3 space-y-2 ${hcenter ? "flex justify-center" : ""} ${vcenter ? "flex items-center" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}