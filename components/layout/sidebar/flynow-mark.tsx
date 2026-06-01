type FlyNowMarkProps = {
  className?: string;
  size?: number;
};

export function FlyNowMark({
  className,
  size = 32,
}: FlyNowMarkProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={["shrink-0 text-[var(--fly-brand)]", className]
        .filter(Boolean)
        .join(" ")}
    >
      <path
        d="M32 6 C32 6 42 16 42 34 L42 50 L32 46 L22 50 L22 34 C22 16 32 6 32 6 Z"
        fill="currentColor"
      />
      <path d="M22 36 L14 42 L22 46 Z" fill="currentColor" />
      <path d="M42 36 L50 42 L42 46 Z" fill="currentColor" />
      <rect
        x="27"
        y="50"
        width="10"
        height="4"
        rx="1"
        fill="var(--fly-brand-shadow)"
      />
    </svg>
  );
}
