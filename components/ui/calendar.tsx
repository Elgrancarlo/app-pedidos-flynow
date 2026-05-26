import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  isWithinInterval,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  sub,
  subDays,
  subHours,
  subMinutes,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import React, { useEffect, useRef, useState } from "react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button-1";
import { Material } from "@/components/ui/material-1";
import { Input } from "@/components/ui/input";
import { useClickOutside } from "@/components/ui/use-click-outside";
import clsx from "clsx";
import { ptBR } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

const ClockIcon = () => (
  <svg height="16" strokeLinejoin="round" viewBox="0 0 16 16" width="16">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.5 8C14.5 11.5899 11.5899 14.5 8 14.5C4.41015 14.5 1.5 11.5899 1.5 8C1.5 4.41015 4.41015 1.5 8 1.5C11.5899 1.5 14.5 4.41015 14.5 8ZM16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM8.75 4.75V4H7.25V4.75V7.875C7.25 8.18976 7.39819 8.48615 7.65 8.675L9.55 10.1L10.15 10.55L11.05 9.35L10.45 8.9L8.75 7.625V4.75Z"
      className="fill-gray-1000"
    />
  </svg>
);

const ArrowBottomIcon = ({ className }: { className?: string }) => (
  <svg
    height="16"
    strokeLinejoin="round"
    viewBox="0 0 16 16"
    width="16"
    className={clsx("fill-gray-1000", className)}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M14.0607 5.49999L13.5303 6.03032L8.7071 10.8535C8.31658 11.2441 7.68341 11.2441 7.29289 10.8535L2.46966 6.03032L1.93933 5.49999L2.99999 4.43933L3.53032 4.96966L7.99999 9.43933L12.4697 4.96966L13 4.43933L14.0607 5.49999Z"
    />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    height="16"
    strokeLinejoin="round"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.5 14.0607L9.96966 13.5303L5.14644 8.7071C4.75592 8.31658 4.75592 7.68341 5.14644 7.29289L9.96966 2.46966L10.5 1.93933L11.5607 2.99999L11.0303 3.53032L6.56065 7.99999L11.0303 12.4697L11.5607 13L10.5 14.0607Z"
      className="fill-gray-700"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    height="16"
    strokeLinejoin="round"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.50001 1.93933L6.03034 2.46966L10.8536 7.29288C11.2441 7.68341 11.2441 8.31657 10.8536 8.7071L6.03034 13.5303L5.50001 14.0607L4.43935 13L4.96968 12.4697L9.43935 7.99999L4.96968 3.53032L4.43935 2.99999L5.50001 1.93933Z"
      className="fill-gray-700"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    height="16"
    strokeLinejoin="round"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.5 0.5V1.25V2H10.5V1.25V0.5H12V1.25V2H14H15.5V3.5V13.5C15.5 14.8807 14.3807 16 13 16H3C1.61929 16 0.5 14.8807 0.5 13.5V3.5V2H2H4V1.25V0.5H5.5ZM2 3.5H14V6H2V3.5ZM2 7.5V13.5C2 14.0523 2.44772 14.5 3 14.5H13C13.5523 14.5 14 14.0523 14 13.5V7.5H2Z"
    />
  </svg>
);

const ClearIcon = () => (
  <svg
    height="16"
    strokeLinejoin="round"
    viewBox="0 0 16 16"
    width="16"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.4697 13.5303L13 14.0607L14.0607 13L13.5303 12.4697L9.06065 7.99999L13.5303 3.53032L14.0607 2.99999L13 1.93933L12.4697 2.46966L7.99999 6.93933L3.53032 2.46966L2.99999 1.93933L1.93933 2.99999L2.46966 3.53032L6.93933 7.99999L2.46966 12.4697L1.93933 13L2.99999 14.0607L3.53032 13.5303L7.99999 9.06065L12.4697 13.5303Z"
    />
  </svg>
);

const FLYNOW_TIMEZONE = "America/Sao_Paulo";
const CALENDAR_POPOVER_EXIT_MS = 150;

const parseRelativeDate = (input: string) => {
  const regex = /(\d+)\s*(day|week|month|year|hour)s?/i;
  const match = input.match(regex);

  if (!match) {
    return null;
  }

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase() + "s";

  const now = new Date();
  const start = startOfDay(sub(now, { [unit]: value }));
  const end = endOfDay(now);

  return {
    [input]: { text: input, start, end }
  };
};

const parseFixedRange = (input: string) => {
  const rangePattern = /(.+)\s*[-–]\s*(.+)/;

  const match = input.match(rangePattern);
  if (!match) {
    return parseExactDate(input);
  }

  const [, startStr, endStr] = match;
  if (!startStr || !endStr) {
    return null;
  }

  const possibleFormats = ["dd/MM/yyyy", "dd/MM", "d MMM yyyy", "d MMM", "yyyy-MM-dd"];

  for (const format of possibleFormats) {
    const now = new Date();
    const year = now.getFullYear();

    const start = parse(startStr, format, now, { locale: ptBR });
    const end = parse(endStr, format, now, { locale: ptBR });

    const finalStart = isValid(start) ? startOfDay(start) : null;
    const finalEnd = isValid(end) ? endOfDay(end) : null;

    if (finalStart && finalEnd) {
      if (format === "d MMM" || format === "dd/MM") {
        finalStart.setFullYear(year);
        finalEnd.setFullYear(year);
      }
      return {
        [input]: { text: input, start: finalStart, end: finalEnd }
      };
    }
  }

  return null;
};

const parseExactDate = (input: string) => {
  const now = new Date();
  const currentYear = now.getFullYear();

  const dateFormats = ["dd/MM/yyyy", "dd/MM", "d MMM yyyy", "d MMM", "yyyy-MM-dd"];

  for (const format of dateFormats) {
    let date = parse(input.trim(), format, now, { locale: ptBR });

    if (isValid(date)) {
      if (format === "d MMM" || format === "dd/MM") {
        date.setFullYear(currentYear);
      }

      return {
        [input]: {
          text: input,
          start: startOfDay(date),
          end: endOfDay(date)
        }
      };
    }
  }

  return null;
};

const parseDateInput = (input: string) => {
  const relative = parseRelativeDate(input);
  if (relative) return relative;

  const fixedRange = parseFixedRange(input);
  if (fixedRange) return fixedRange;

  const exact = parseExactDate(input);
  if (exact) return exact;

  return null;
};

const filterPresets = (obj: Record<string, any>, search: string) => {
  if (!search) {
    return obj;
  }

  const searchWords = search.toLowerCase().split("-").filter(Boolean);

  const filtered = Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => {
      const keyLower = value.text.toLowerCase();
      return searchWords.every(word => keyLower.includes(word));
    })
  );

  if (Object.entries(filtered).length > 0) {
    return filtered;
  }

  const parsed = parseDateInput(search);
  if (parsed) {
    return parsed;
  }

  const numberMatch = search.match(/\d+/);
  if (!numberMatch) {
    return {};
  }

  const n = parseInt(numberMatch[0], 10);
  const now = new Date();

  return {
    [`last-${n}-days`]: {
      text: `Last ${n} Days`,
      start: startOfDay(subDays(now, n)),
      end: endOfDay(now)
    },
    [`last-${n}-weeks`]: {
      text: `Last ${n} Weeks`,
      start: startOfDay(subWeeks(now, n)),
      end: endOfDay(now)
    },
    [`last-${n}-months`]: {
      text: `Last ${n} Months`,
      start: startOfDay(subMonths(now, n)),
      end: endOfDay(now)
    },
    [`last-${n}-years`]: {
      text: `Last ${n} Years`,
      start: startOfDay(subYears(now, n)),
      end: endOfDay(now)
    }
  };
};

const formatDateRange = (start: Date, end: Date, timezone: string) => {
  const sameDay = isSameDay(start, end);
  const formatSingle = (date: Date) =>
    formatInTimeZone(date, timezone, "dd/MM/yyyy");

  if (sameDay) {
    return formatSingle(start);
  }

  return `${formatSingle(start)} - ${formatSingle(end)}`;
};

const typeRelativeTimes = [
  {
    text: "45m",
    start: subMinutes(new Date(), 45),
    end: new Date()
  },
  {
    text: "12 hours",
    start: subHours(new Date(), 12),
    end: new Date()
  },
  {
    text: "10d",
    start: startOfDay(subDays(new Date(), 10)),
    end: endOfDay(new Date())
  },
  {
    text: "2 weeks",
    start: startOfDay(subWeeks(new Date(), 2)),
    end: endOfDay(new Date())
  },
  {
    text: "mês anterior",
    start: startOfDay(subMonths(new Date(), 1)),
    end: endOfDay(new Date())
  },
  {
    text: "ontem",
    start: startOfDay(subDays(new Date(), 1)),
    end: endOfDay(subDays(new Date(), 1))
  },
  {
    text: "hoje",
    start: startOfDay(new Date()),
    end: endOfDay(new Date())
  }
];
const typeFixedTimes = [
  {
    text: "Jan 1",
    start: startOfDay(new Date(new Date().getFullYear(), 0, 1)),
    end: endOfDay(new Date(new Date().getFullYear(), 0, 1))
  },
  {
    text: "Jan 1 - Jan 2",
    start: startOfDay(new Date(new Date().getFullYear(), 0, 1)),
    end: endOfDay(new Date(new Date().getFullYear(), 0, 2))
  },
  {
    text: "1/1",
    start: startOfDay(new Date(new Date().getFullYear(), 0, 1)),
    end: endOfDay(new Date(new Date().getFullYear(), 0, 1))
  },
  {
    text: "1/1 - 1/2",
    start: startOfDay(new Date(new Date().getFullYear(), 0, 1)),
    end: endOfDay(new Date(new Date().getFullYear(), 0, 2))
  }
];

interface CalendarComboboxProps {
  stacked: boolean;
  compact: boolean;
  value: RangeValue | null;
  onChange: (date: RangeValue | null) => void;
  presets: {
    [key: string]: {
      text: string;
      start: Date;
      end: Date;
    };
  };
  presetIndex?: number;
}

const CalendarCombobox = ({
  stacked,
  compact,
  value,
  onChange,
  presets,
  presetIndex
}: CalendarComboboxProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>("");
  const [currentPreset, setCurrentPreset] = useState<any | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const onFocus = () => {
    setIsOpen(true);
  };

  const onChangeInputValue = (value: string) => {
    setInputValue(value);
  };

  const onClick = (value: any) => {
    setInputValue(value.text);
    setCurrentPreset(value);
    onChange({ start: value.start, end: value.end });
    setIsOpen(false);
  };

  const filteredPresets = filterPresets(presets, inputValue);

  useClickOutside(ref, () => setIsOpen(false));

  useEffect(() => {
    const array = Object.entries(presets);
    if (presetIndex !== undefined && presetIndex >= 0 && presetIndex < array.length) {
      setInputValue(array[presetIndex][1].text);
      setCurrentPreset(array[presetIndex][1]);
      onChange({ start: array[presetIndex][1].start, end: array[presetIndex][1].end });
    }
  }, [presetIndex]);

  useEffect(() => {
    if (currentPreset) {
      if (currentPreset.start !== value?.start || currentPreset.end !== value?.end) {
        setCurrentPreset(null);
        setInputValue("");
      }
    }
  }, [value]);

  return (
    <div
      ref={ref}
      className={twMerge(clsx(
        "inline-block text-sm font-sans",
        compact ? "w-[180px] absolute left-[38px]" : "w-[250px] relative",
        compact && !isOpen && "pl-[140px]",
        compact && (isOpen || (currentPreset && currentPreset?.start === value?.start && currentPreset?.end === value?.end)) && "pl-0"
      ))}
    >
      <Input
        prefix={compact ? undefined : <ClockIcon />}
        prefixStyling={"pl-2.5"}
        suffix={<ArrowBottomIcon className={clsx("duration-200", isOpen && "rotate-180")} />}
        suffixStyling={clsx(
          "cursor-pointer",
          compact && !isOpen && (!currentPreset || (currentPreset?.start !== value?.start && currentPreset?.end !== value?.end)) && "w-10 !px-0"
        )}
        placeholder="Buscar período"
        onFocus={onFocus}
        value={inputValue}
        onChange={onChangeInputValue}
        wrapperClassName={clsx(
          "hover:z-10",
          stacked && !compact && "rounded-b-none",
          !stacked && !compact && "rounded-r-none",
          compact && "rounded-l-none",
          (isOpen || (compact && currentPreset && currentPreset?.start === value?.start && currentPreset?.end === value?.end)) && "z-10"
        )}
        className={clsx(
          "pl-2 placeholder:!text-gray-1000 placeholder:!opacity-100",
          compact && !isOpen && (!currentPreset || (currentPreset?.start !== value?.start && currentPreset?.end !== value?.end)) && "!w-0 !px-0"
        )}
      />
      <Material
        type="menu"
        className={clsx(
          "absolute z-50 top-12 left-0",
          compact ? "w-full" : "grid grid-cols-2 w-[200%]",
          isOpen && "opacity-100",
          !isOpen && "opacity-0 pointer-events-none duration-200"
        )}
      >
        <ul className="p-2 border-r border-r-gray-200">
          {Object.entries(filteredPresets).length > 0 ? Object.entries(filteredPresets).map(([key, value]) => (
            <li
              key={key}
              className="flex items-center cursor-pointer px-2 w-full h-9 rounded-md hover:bg-gray-alpha-300 active:bg-gray-alpha-300 font-sans text-sm text-gray-1000"
              onClick={() => onClick(value)}
            >
              {value.text}
            </li>
          )) : (
            <li
              className="flex items-center cursor-pointer px-2 w-full h-9 rounded-md hover:bg-gray-alpha-300 active:bg-gray-alpha-300 font-sans text-sm text-gray-1000">
              {inputValue}
            </li>
          )}
        </ul>
        {!compact && (
          <div className="p-4 pr-[30px]">
            <div className="font-sans text-gray-900 text-sm">Períodos relativos</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {typeRelativeTimes.map((value) => (
                <button
                  key={value.text}
                  className="font-mono text-[13px] text-gray-1000 px-1.5 h-5 inline-flex items-center bg-accents-2 border-none rounded cursor-pointer"
                  onClick={() => onClick(value)}
                >
                  {value.text}
                </button>
              ))}
            </div>
            <div className="font-sans text-gray-900 text-sm mt-4">Datas fixas</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {typeFixedTimes.map((value) => (
                <button
                  key={value.text}
                  className="font-mono text-[13px] text-gray-1000 px-1.5 h-5 inline-flex items-center bg-accents-2 border-none rounded cursor-pointer"
                >
                  {value.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </Material>
    </div>
  );
};

export interface RangeValue {
  start: Date | null;
  end: Date | null;
}

interface CalendarProps {
  allowClear?: boolean;
  compact?: boolean;
  isDocsPage?: boolean;
  stacked?: boolean;
  horizontalLayout?: boolean;
  showTimeInput?: boolean;
  popoverAlignment?: "start" | "center" | "end";
  className?: string;
  triggerClassName?: string;
  triggerActive?: boolean;
  popoverClassName?: string;
  value: RangeValue | null;
  onChange: (date: RangeValue | null) => void;
  presets?: {
    [key: string]: {
      text: string;
      start: Date;
      end: Date;
    };
  };
  presetIndex?: number;
  minValue?: Date;
  maxValue?: Date;
}

export const Calendar = ({
  allowClear = false,
  compact = false,
  isDocsPage = false,
  stacked = false,
  horizontalLayout = false,
  showTimeInput = true,
  popoverAlignment = "start",
  className,
  triggerClassName,
  triggerActive = false,
  popoverClassName,
  value,
  onChange,
  presets,
  presetIndex,
  minValue,
  maxValue
}: CalendarProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPopoverMounted, setIsPopoverMounted] = useState<boolean>(false);
  const [isPopoverClosing, setIsPopoverClosing] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [draftValue, setDraftValue] = useState<RangeValue | null>(value);
  const selectedTimezone = FLYNOW_TIMEZONE;
  const [startDate, setStartDate] = useState<string>(formatInTimeZone(value?.start || new Date(), selectedTimezone, "dd/MM/yyyy"));
  const [startTime, setStartTime] = useState<string>(formatInTimeZone(startOfDay(value?.start || new Date()), selectedTimezone, "HH:mm"));
  const [endDate, setEndDate] = useState<string>(formatInTimeZone(value?.end || new Date(), selectedTimezone, "dd/MM/yyyy"));
  const [endTime, setEndTime] = useState<string>(formatInTimeZone(endOfDay(value?.end || new Date()), selectedTimezone, "HH:mm"));
  const [startDateError, setStartDateError] = useState<boolean>(false);
  const [startTimeError, setStartTimeError] = useState<boolean>(false);
  const [endDateError, setEndDateError] = useState<boolean>(false);
  const [endTimeError, setEndTimeError] = useState<boolean>(false);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(false);
  const ignoreNextTriggerClickRef = useRef(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>();

  const updatePopoverPosition = () => {
    if (!triggerRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 16;
    const popoverWidth = Math.min(
      horizontalLayout ? 462 : 280,
      window.innerWidth - viewportPadding * 2
    );
    let left = triggerRect.left;

    if (popoverAlignment === "center") {
      left = triggerRect.left + triggerRect.width / 2 - popoverWidth / 2;
    }

    if (popoverAlignment === "end") {
      left = triggerRect.right - popoverWidth;
    }

    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - popoverWidth - viewportPadding)
    );

    let top = triggerRect.bottom + 8;
    const availableBelow = window.innerHeight - top - viewportPadding;

    if (availableBelow < 280) {
      top = viewportPadding;
    }

    setPopoverStyle({
      left,
      top,
      width: popoverWidth,
      maxHeight: window.innerHeight - top - viewportPadding,
    });
  };

  const closeCalendar = () => {
    isOpenRef.current = false;
    setIsOpen(false);
    setIsPopoverClosing(true);
  };

  const openCalendar = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    updatePopoverPosition();
    isOpenRef.current = true;
    setIsPopoverMounted(true);
    setIsPopoverClosing(false);
    setIsOpen(true);
  };

  const toggleCalendar = () => {
    if (ignoreNextTriggerClickRef.current) {
      ignoreNextTriggerClickRef.current = false;
      return;
    }

    if (isOpenRef.current) {
      closeCalendar();
      return;
    }

    openCalendar();
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const isNextMonthDisabled = maxValue
    ? startOfMonth(addMonths(currentDate, 1)) > startOfMonth(maxValue)
    : false;
  const nextMonth = () => {
    if (!isNextMonthDisabled) {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const setDraftDateInputs = (nextValue: RangeValue | null) => {
    if (!nextValue?.start) {
      return;
    }

    setStartDate(formatInTimeZone(nextValue.start, selectedTimezone, "dd/MM/yyyy"));
    setStartTime(formatInTimeZone(nextValue.start, selectedTimezone, "HH:mm"));
    setEndDate(formatInTimeZone(nextValue.end || nextValue.start, selectedTimezone, "dd/MM/yyyy"));
    setEndTime(formatInTimeZone(nextValue.end || endOfDay(nextValue.start), selectedTimezone, "HH:mm"));
  };

  const daysArray = [];
  let day = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  while (day <= endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })) {
    daysArray.push(day);
    day = addDays(day, 1);
  }

  const handleDateClick = (day: Date) => {
    const selectedStart = startOfDay(day);

    if (!draftValue?.start || (draftValue.start && draftValue.end)) {
      const nextValue = { start: selectedStart, end: null };

      setDraftValue(nextValue);
      setDraftDateInputs(nextValue);
      setHoverDate(day);
      setIsSelecting(true);
      return;
    }

    if (isSelecting) {
      const nextValue =
        day > draftValue.start
          ? { start: draftValue.start, end: endOfDay(day) }
          : { start: selectedStart, end: endOfDay(draftValue.start) };

      setDraftValue(nextValue);
      setDraftDateInputs(nextValue);
      setIsSelecting(false);
      setHoverDate(null);
    }
  };

  const handleMouseEnter = (day: Date) => {
    if (draftValue?.start && !draftValue.end) {
      setHoverDate(day);
    }
  };

  const onApply = () => {
    const parsedStartDate = parse(startDate, "dd/MM/yyyy", new Date());
    const parsedStartTime = parse(startTime || "", "HH:mm", new Date());
    const parsedEndDate = parse(endDate, "dd/MM/yyyy", new Date());
    const parsedEndTime = parse(endTime || "", "HH:mm", new Date());
    const parsedStart = parse(`${startDate} ${startTime}`, "dd/MM/yyyy HH:mm", new Date());
    const parsedEnd = parse(`${endDate} ${endTime}`, "dd/MM/yyyy HH:mm", new Date());

    const hasInvalidStartDate = parsedStartDate.toString() === "Invalid Date";
    const hasInvalidStartTime = parsedStartTime.toString() === "Invalid Date";
    const hasInvalidEndDate = parsedEndDate.toString() === "Invalid Date";
    const hasInvalidEndTime = parsedEndTime.toString() === "Invalid Date";

    const maxDateExceeded =
      maxValue && !hasInvalidStartDate && !hasInvalidEndDate
        ? parsedStartDate > maxValue || parsedEndDate > maxValue
        : false;
    const invalidOrder =
      !hasInvalidStartDate &&
      !hasInvalidStartTime &&
      !hasInvalidEndDate &&
      !hasInvalidEndTime &&
      parsedStart > parsedEnd;

    setStartDateError(hasInvalidStartDate || Boolean(maxValue && parsedStartDate > maxValue) || invalidOrder);
    setStartTimeError(hasInvalidStartTime || invalidOrder);
    setEndDateError(hasInvalidEndDate || Boolean(maxValue && parsedEndDate > maxValue) || invalidOrder);
    setEndTimeError(hasInvalidEndTime || invalidOrder);

    if (
      hasInvalidStartDate ||
      hasInvalidStartTime ||
      hasInvalidEndDate ||
      hasInvalidEndTime ||
      maxDateExceeded ||
      invalidOrder
    ) {
      return;
    }

    onChange({
      start: fromZonedTime(parsedStart, selectedTimezone),
      end: fromZonedTime(parsedEnd, selectedTimezone)
    });
    setDraftValue({
      start: fromZonedTime(parsedStart, selectedTimezone),
      end: fromZonedTime(parsedEnd, selectedTimezone)
    });
    closeCalendar();
  };

  const onClear = () => {
    onChange(null);
    setDraftValue(null);
    setHoverDate(null);
    setIsSelecting(false);
    setStartDateError(false);
    setStartTimeError(false);
    setEndDateError(false);
    setEndTimeError(false);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftValue(value);
    setStartDate(formatInTimeZone(value?.start || new Date(), selectedTimezone, "dd/MM/yyyy"));
    setStartTime(formatInTimeZone(value?.start || startOfDay(new Date()), selectedTimezone, "HH:mm"));
    setEndDate(formatInTimeZone(value?.end || new Date(), selectedTimezone, "dd/MM/yyyy"));
    setEndTime(formatInTimeZone(value?.end || endOfDay(new Date()), selectedTimezone, "HH:mm"));
  }, [isOpen, value, selectedTimezone]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updatePopoverPosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleResize = () => updatePopoverPosition();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      const clickedTrigger = calendarRef.current?.contains(target);
      const clickedPopover = popoverRef.current?.contains(target);

      if (clickedPopover) {
        return;
      }

      if (clickedTrigger) {
        ignoreNextTriggerClickRef.current = true;
        closeCalendar();
        return;
      }

      closeCalendar();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isPopoverClosing) {
      return;
    }

    closeTimeoutRef.current = setTimeout(() => {
      setIsPopoverMounted(false);
      setIsPopoverClosing(false);
      closeTimeoutRef.current = null;
    }, CALENDAR_POPOVER_EXIT_MS);

    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [isPopoverClosing]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const popoverOriginClass =
    popoverAlignment === "end"
      ? "origin-top-right"
      : popoverAlignment === "center"
        ? "origin-top"
        : "origin-top-left";

  return (
    <div ref={calendarRef} className={twMerge(clsx("relative", className))}>
      <div className={clsx(
        presets && "flex",
        presets && stacked && "flex-col",
        compact && "w-[220px]"
      )}>
        {presets && (
          <div>
            <CalendarCombobox
              stacked={stacked}
              compact={compact}
              presets={presets}
              value={value}
              onChange={onChange}
              presetIndex={presetIndex}
            />
          </div>
        )}
        <div className="flex justify-between items-center">
          <div
            ref={triggerRef}
            className="relative w-full"
            onClickCapture={(event) => {
              if (isOpenRef.current) {
                ignoreNextTriggerClickRef.current = true;
                event.preventDefault();
                event.stopPropagation();
                closeCalendar();
              }
            }}
          >
            <Button
              aria-pressed={triggerActive}
              className={clsx(
                "relative !justify-start focus:!border-transparent focus:!shadow-focus-input",
                presets && !stacked && !compact && "rounded-l-none -ml-[1px]",
                presets && stacked && !compact && "rounded-t-none -mt-[1px]",
                presets && compact && "rounded-r-none -mr-[1px]",
                compact ? "w-[180px] gap-1.5" : "w-[250px]",
                triggerClassName
              )}
              prefix={<CalendarIcon />}
              type="secondary"
              onClick={toggleCalendar}
            >
              <div className="truncate pr-4">
                {value?.start && value?.end ?
                  formatDateRange(value.start, value.end, selectedTimezone)
                  : "Selecionar período"
                }
              </div>
            </Button>
            {allowClear && value?.start && value?.end && (
              <Button
                aria-label="Limpar período"
                svgOnly
                variant="unstyled"
                className="absolute right-0 top-1/2 -translate-y-1/2 fill-gray-700 hover:fill-gray-1000"
                onClick={() => onChange(null)}
              >
                <ClearIcon />
              </Button>
            )}
          </div>
        </div>
      </div>
      {isPopoverMounted && createPortal(
        <Material
          ref={popoverRef}
          type="menu"
          style={popoverStyle}
          className={twMerge(clsx(
            "flynow-calendar-popover fixed z-50 overflow-y-auto overscroll-contain border border-[#D6A84F]/20 bg-[#08090B]/62 p-3 font-sans shadow-[0_28px_90px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.045),inset_0_1px_0_rgba(255,255,255,0.13),inset_0_0_36px_rgba(255,255,255,0.035)] backdrop-blur-[28px]",
            isPopoverClosing && "flynow-calendar-popover--closing",
            popoverOriginClass,
            horizontalLayout ? "w-[min(462px,calc(100vw-2rem))]" : "w-[min(280px,calc(100vw-2rem))]",
            popoverClassName
          ))}
        >
          <div className={clsx(horizontalLayout && "flex flex-col gap-4 min-[520px]:flex-row min-[520px]:gap-5")}>
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm text-[#F5F2EA] font-medium">
                  {formatInTimeZone(currentDate, selectedTimezone, "MMMM yyyy", { locale: ptBR })}
                </h2>
                <div className="flex gap-0.5">
                  <Button
                    variant="unstyled"
                    className="rounded-md fill-[#858A94] p-1.5 hover:bg-[#15171C] hover:fill-[#F5F2EA]"
                    onClick={prevMonth}
                  >
                    <ArrowLeftIcon />
                  </Button>
                  <Button
                    variant="unstyled"
                    disabled={isNextMonthDisabled}
                    className="rounded-md fill-[#858A94] p-1.5 hover:bg-[#15171C] hover:fill-[#F5F2EA] disabled:cursor-not-allowed disabled:fill-[#4F535C] disabled:opacity-45 disabled:hover:bg-transparent"
                    onClick={nextMonth}
                  >
                    <ArrowRightIcon />
                  </Button>
                </div>
              </div>
              <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-[0.08em] text-[#747882]">
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sab</div>
                <div>Dom</div>
              </div>
              <div className="grid grid-cols-7 items-center gap-y-2">
                {daysArray.map((day) => {
                  const isStart = draftValue?.start && isSameDay(day, draftValue.start);
                  const isEnd = draftValue?.end && isSameDay(day, draftValue.end);
                  const currentHover = hoverDate && isSelecting && isSameDay(day, hoverDate);
                  const isInRange =
                    draftValue?.start &&
                    ((draftValue.end && isWithinInterval(day, { start: draftValue.start, end: draftValue.end })) ||
                      (hoverDate && isWithinInterval(day, { start: draftValue.start, end: hoverDate })));
                  const isAllowedDate =
                    (minValue ? day >= startOfDay(minValue) : true) &&
                    (maxValue ? day <= endOfDay(maxValue) : true);

                  return (
                    <div
                      key={day.toString()}
                      className={clsx(
                        "flex items-center justify-center text-sm text-center rounded transition",
                        isSameMonth(day, currentDate) && isAllowedDate ? "bg-transparent text-[#DADDE2]" : "bg-transparent text-[#4F535C]",
                        isInRange && !isStart && !isEnd && !currentHover && "!bg-[#D6A84F]/12 rounded-none",
                        isAllowedDate ? "cursor-pointer" : "cursor-not-allowed"
                      )}
                      onMouseEnter={() => isAllowedDate && handleMouseEnter(day)}
                      onClick={() => isAllowedDate && handleDateClick(day)}
                    >
                      <div className={clsx(
                        "h-8 w-8 flex items-center justify-center rounded-md border border-transparent transition-colors",
                        (isStart || isEnd || currentHover) && isAllowedDate && " !border-[#E6BF68] !bg-[#D6A84F] !text-[#08090B] shadow-[0_0_0_1px_rgba(214,168,79,0.28),0_8px_20px_rgba(214,168,79,0.18)]",
                        !isStart && !isEnd && !currentHover && !isToday(day) && isAllowedDate && "hover:border-[#D6A84F]/35 hover:bg-[#D6A84F]/10 hover:text-[#F5F2EA]",
                        !isAllowedDate && "opacity-35",
                        currentHover && isAllowedDate && " !shadow-[0_0_0_2px_rgba(214,168,79,0.28)]",
                        isToday(day) && !isStart && !isEnd && " !border-[#D6A84F]/45 !bg-[#D6A84F]/10 !text-[#F0C76A]"
                      )}>
                        {format(day, "d")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={clsx(
              "flex flex-col gap-2",
              horizontalLayout ? "justify-between" : "mt-3 -mx-3 px-3 pt-2.5 border-t border-[#242932]"
            )}>
              <div className="flex flex-col gap-2">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#747882]">Início</div>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className={showTimeInput ? "col-span-2" : "col-span-3"}>
                      <Input
                        size="small"
                        value={startDate}
                        onChange={(value) => setStartDate(value)}
                        error={startDateError}
                        wrapperClassName="!border-[#242932] !bg-[#0E1014] hover:!border-[#3A404B] focus-within:!border-[#D6A84F]/70 focus-within:!shadow-[0_0_0_3px_rgba(214,168,79,0.12)]"
                        className="!bg-[#0E1014] !text-[#F5F2EA] placeholder:!text-[#747882]"
                      />
                    </div>
                    {showTimeInput && (
                      <Input
                        size="small"
                        value={startTime}
                        onChange={(value) => setStartTime(value)}
                        error={startTimeError}
                        wrapperClassName="!border-[#242932] !bg-[#0E1014] hover:!border-[#3A404B] focus-within:!border-[#D6A84F]/70 focus-within:!shadow-[0_0_0_3px_rgba(214,168,79,0.12)]"
                        className="!bg-[#0E1014] !text-[#F5F2EA] placeholder:!text-[#747882]"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#747882]">Fim</div>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className={showTimeInput ? "col-span-2" : "col-span-3"}>
                      <Input
                        size="small"
                        value={endDate}
                        onChange={(value) => setEndDate(value)}
                        error={endDateError}
                        wrapperClassName="!border-[#242932] !bg-[#0E1014] hover:!border-[#3A404B] focus-within:!border-[#D6A84F]/70 focus-within:!shadow-[0_0_0_3px_rgba(214,168,79,0.12)]"
                        className="!bg-[#0E1014] !text-[#F5F2EA] placeholder:!text-[#747882]"
                      />
                    </div>
                    {showTimeInput && (
                      <Input
                        size="small"
                        value={endTime}
                        onChange={(value) => setEndTime(value)}
                        error={endTimeError}
                        wrapperClassName="!border-[#242932] !bg-[#0E1014] hover:!border-[#3A404B] focus-within:!border-[#D6A84F]/70 focus-within:!shadow-[0_0_0_3px_rgba(214,168,79,0.12)]"
                        className="!bg-[#0E1014] !text-[#F5F2EA] placeholder:!text-[#747882]"
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-[0.72fr_1fr] gap-2 font-medium">
                  <Button
                    type="secondary"
                    size="small"
                    disabled={!value?.start && !value?.end}
                    className="!border-[#242932] !bg-[#0E1014] !text-[#A3A6AE] hover:!border-[#3A404B] hover:!bg-[#13161B] hover:!text-[#F5F2EA]"
                    onClick={onClear}
                  >
                    Limpar
                  </Button>
                  <Button
                    type="warning"
                    size="small"
                    suffix={<span className="mt-1 text-xs">↵</span>}
                    className="!border !border-[#D6A84F]/35 !bg-[#D6A84F] !text-[#08090B] shadow-[0_10px_24px_rgba(214,168,79,0.18)] hover:!bg-[#E5BE67]"
                    onClick={onApply}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Material>,
        document.body
      )}
    </div>
  );
};
