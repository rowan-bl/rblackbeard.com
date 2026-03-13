import { type ReactNode } from "react";

interface Props {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export default function Button({ onClick, disabled, children, className }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-gray-700 text-xs px-3 py-2 font-bold hover:bg-gray-600 disabled:opacity-50 ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
