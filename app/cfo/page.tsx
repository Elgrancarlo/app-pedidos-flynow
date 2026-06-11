import { redirect } from "next/navigation";

import { normalizeMetasMonth } from "@/lib/metas";

export const dynamic = "force-dynamic";

type CfoPageParams = {
  endDate?: string;
  mes?: string;
  startDate?: string;
};

export default async function CfoPage({
  searchParams,
}: {
  searchParams: Promise<CfoPageParams>;
}) {
  const params = await searchParams;
  const month = normalizeMetasMonth(params.mes ?? params.startDate ?? params.endDate);

  redirect(`/metas?mes=${month}`);
}
