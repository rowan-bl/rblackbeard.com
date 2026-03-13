import { type ReactNode } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  buttonLabel: ReactNode;
}

export default function InputButton({ value, onChange, onSubmit, placeholder, disabled, buttonLabel }: Props) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        placeholder={placeholder}
        className="flex-1 bg-(--rcolor-8) px-3 py-2 focus:outline-none"
      />
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="bg-gray-700 px-4 py-2 font-bold hover:bg-gray-600 disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
