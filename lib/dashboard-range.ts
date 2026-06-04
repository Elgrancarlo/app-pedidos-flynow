import { getTodayInAppTimezone, shiftDateString } from "@/lib/app-dates";

export type DashboardRange = {
  startDate: string;
  endDate: string;
};

export function getDefaultDashboardRange(): DashboardRange {
  const endDate = getTodayInAppTimezone();

  return {
    startDate: shiftDateString(endDate, -29),
    endDate,
  };
}

export function getDashboardOperationalDatasetRange(): DashboardRange {
  const endDate = getTodayInAppTimezone();
  const end = new Date(`${endDate}T12:00:00Z`);
  const previousMonthStart = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1, 12)
  );

  return {
    startDate: previousMonthStart.toISOString().slice(0, 10),
    endDate,
  };
}
