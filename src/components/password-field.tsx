"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Parol input — ko'z bilan ochiq/yopiq ko'rish */
export function PasswordField({
  value,
  onChange,
  label,
  placeholder,
  required,
  minLength = 6,
  name,
  autoComplete,
  className = "",
  inputClassName = "w-full rounded-xl border border-stone-200 px-3 py-2.5 pr-11",
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  name?: string;
  autoComplete?: string;
  className?: string;
  inputClassName?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <label className={`block text-sm ${className}`}>
      {label ? (
        <span className="font-medium text-stone-600">{label}</span>
      ) : null}
      <div className={`relative ${label ? "mt-1" : ""}`}>
        <input
          name={name}
          required={required}
          minLength={minLength}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClassName}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
