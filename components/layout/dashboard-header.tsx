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
    <header className="flex min-h-[88px] flex-col justify-end gap-4 bg-[#050505] px-6 pb-4 pt-6 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-none text-[#F5F2EA]">
          {title}
        </h1>

        {description ? (
          <p className="mt-2 max-w-xl text-sm leading-5 text-[#7D7A73]">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex w-full items-end gap-2 xl:w-auto xl:shrink-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
