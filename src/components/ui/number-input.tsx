"use client";

import type { InputHTMLAttributes } from "react";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: number | "";
  onValueChange: (value: number | "") => void;
};

/**
 * Raqam yozishda 0 qolib ketmasin — fokusda tanlanadi,
 * bo'sh qoldirish mumkin (0 o'rniga).
 */
export function NumberInput({
  value,
  onValueChange,
  className,
  onFocus,
  ...rest
}: Props) {
  return (
    <input
      {...rest}
      type="number"
      className={className}
      value={value === "" || value === 0 ? "" : value}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "") {
          onValueChange("");
          return;
        }
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        onValueChange(n);
      }}
      onFocus={(e) => {
        e.target.select();
        onFocus?.(e);
      }}
    />
  );
}
