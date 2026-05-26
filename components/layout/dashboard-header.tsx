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
    <header className="flex items-center justify-between border-b border-[#252B33] bg-[#050505] px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold text-[#F5F2EA]">{title}</h1>

        {description ? (
          <p className="mt-1 text-sm text-[#B8B3A7]">
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
