import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function SidebarLink({
  href,
  label,
  Icone,
  ativo,
}: {
  href: string;
  label: string;
  Icone: LucideIcon;
  ativo: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={[
        "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]",
        ativo
          ? "bg-[var(--fly-control-active)] text-[var(--fly-text)]"
          : "text-[var(--fly-text-soft)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text)]",
      ].join(" ")}
    >
      <Icone
        size={18}
        strokeWidth={2}
        className={[
          "shrink-0 transition-colors duration-150",
          ativo
            ? "text-[var(--fly-brand-strong)]"
            : "text-[var(--fly-text-muted)] group-hover:text-[var(--fly-text-soft)]",
        ].join(" ")}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function MobileNavLink({
  href,
  label,
  Icone,
  ativo,
  featured = false,
}: {
  href: string;
  label: string;
  Icone: LucideIcon;
  ativo: boolean;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={[
        "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-[8px] px-1 text-[10px] font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]",
        featured ? "h-16 -translate-y-2" : "h-14",
        ativo || featured
          ? "text-[var(--fly-text)]"
          : "text-[var(--fly-text-muted)] hover:bg-[var(--fly-control-hover)] hover:text-[var(--fly-text)]",
        ativo && !featured ? "bg-[var(--fly-control-active)]" : "",
      ].join(" ")}
    >
      {ativo ? (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1 h-0.5 w-5 -translate-x-1/2 rounded-full bg-[var(--fly-brand-strong)]"
        />
      ) : null}
      <span
        className={[
          "flex items-center justify-center transition-colors duration-150",
          featured
            ? [
                "size-10 rounded-[12px] border",
                ativo
                  ? "border-[var(--fly-brand-border)] bg-[var(--fly-brand-surface)] shadow-[0_8px_22px_rgba(214,168,79,0.1),var(--fly-panel-inset)]"
                  : "border-[var(--fly-border)] bg-[var(--fly-control-solid)] shadow-[0_8px_20px_rgba(0,0,0,0.18),var(--fly-panel-inset)]",
              ].join(" ")
            : "",
        ].join(" ")}
      >
        <Icone
          size={featured ? 19 : 18}
          strokeWidth={2.1}
          className={[
            "shrink-0 transition-colors duration-150",
            ativo || featured
              ? "text-[var(--fly-brand-strong)]"
              : "text-[var(--fly-text-muted)]",
          ].join(" ")}
        />
      </span>
      <span className="block w-max max-w-[64px] truncate leading-none">
        {label}
      </span>
    </Link>
  );
}

export function MobileSheetLink({
  href,
  label,
  Icone,
  ativo,
  onClick,
}: {
  href: string;
  label: string;
  Icone: LucideIcon;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      onClick={onClick}
      className={[
        "group flex h-10 items-center gap-3 rounded-[10px] px-2 text-sm font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[var(--fly-brand-ring)]",
        ativo
          ? "bg-[var(--fly-control-active)] text-[var(--fly-text)]"
          : "text-[var(--fly-text-soft)] hover:bg-[var(--fly-control)] hover:text-[var(--fly-text)]",
      ].join(" ")}
    >
      <Icone
        size={17}
        strokeWidth={2.05}
        className={[
          "shrink-0 transition-colors duration-150",
          ativo
            ? "text-[var(--fly-brand-strong)]"
            : "text-[var(--fly-text-muted)] group-hover:text-[var(--fly-text)]",
        ].join(" ")}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {ativo ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fly-brand-strong)]"
        />
      ) : null}
    </Link>
  );
}
