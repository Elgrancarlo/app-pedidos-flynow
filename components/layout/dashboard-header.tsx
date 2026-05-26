type DashboardHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function DashboardHeader({
  title,
  description,
  actions,
}: DashboardHeaderProps) {
  return (
    <header className="flex min-h-[68px] items-center justify-between border-b border-[#242932] bg-[#050505] px-6 py-3.5">
      <div>
        <h1 className="text-[22px] font-semibold leading-tight text-[#F5F2EA]">{title}</h1>

        {description ? (
          <p className="mt-1 text-sm text-[#7D7A73]">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
