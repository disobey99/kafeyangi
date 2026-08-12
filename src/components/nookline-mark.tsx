type NooklineMarkProps = {
  className?: string;
  size?: number;
  alt?: string;
};

/** Nookline brend belgisi — stakan ikonkasi o'rniga */
export function NooklineMark({
  className = "",
  size = 40,
  alt = "Nookline",
}: NooklineMarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/nookline-mark.png?v=5"
      alt={alt}
      width={size}
      height={size}
      className={`block shrink-0 object-cover ${className}`}
      style={{ width: size, height: size, background: "transparent" }}
      draggable={false}
    />
  );
}
