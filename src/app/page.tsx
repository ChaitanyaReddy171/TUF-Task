"use client";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useEffect, useMemo, useRef, useState } from "react";

type DayCell = {
  date: Date;
  inCurrentMonth: boolean;
};

type ThemePreset = {
  id: "alpine" | "sunset" | "forest" | "aurora" | "coastal";
  name: string;
  image: string;
  year: string;
  title: string;
  subtitle: string;
};

type HolidayInfo = {
  label: string;
  image: string;
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MIN_YEAR = 1970;
const MAX_YEAR = 2030;
const INDIA_HOLIDAYS_FEED_URL =
  "https://calendar.google.com/calendar/ical/en.indian%23holiday%40group.v.calendar.google.com/public/basic.ics";

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "alpine",
    name: "Alpine",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=80",
    year: "2026",
    title: "Expedition Planner",
    subtitle: "Design-led monthly coordination board",
  },
  {
    id: "sunset",
    name: "Sunset",
    image:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80",
    year: "2026",
    title: "Horizon Schedule",
    subtitle: "Balanced planning for field and office work",
  },
  {
    id: "forest",
    name: "Forest",
    image:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80",
    year: "2026",
    title: "Greenline Calendar",
    subtitle: "Steady rhythm for milestones and delivery",
  },
  {
    id: "aurora",
    name: "Aurora",
    image:
      "https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&w=1400&q=80",
    year: "2026",
    title: "Polar Timeline",
    subtitle: "High-clarity planning with cool atmospheric tones",
  },
  {
    id: "coastal",
    name: "Coastal",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80",
    year: "2026",
    title: "Tide Planner",
    subtitle: "Calm, bright scheduling for cross-team execution",
  },
];

const FALLBACK_HOLIDAY_MAP: Record<string, HolidayInfo> = {
  "01-01": {
    label: "New Year",
    image: "https://img.icons8.com/color/96/fireworks.png",
  },
  "02-14": {
    label: "Valentine's Day",
    image: "https://img.icons8.com/color/96/hearts.png",
  },
  "03-08": {
    label: "Women's Day",
    image: "https://img.icons8.com/color/96/flower.png",
  },
  "04-22": {
    label: "Earth Day",
    image: "https://img.icons8.com/color/96/earth-planet.png",
  },
  "05-01": {
    label: "Labour Day",
    image: "https://img.icons8.com/color/96/toolbox.png",
  },
  "06-21": {
    label: "Yoga Day",
    image: "https://img.icons8.com/color/96/meditation-guru.png",
  },
  "07-04": {
    label: "Independence Day",
    image: "https://img.icons8.com/color/96/usa.png",
  },
  "08-15": {
    label: "Independence Day",
    image: "https://img.icons8.com/color/96/india.png",
  },
  "09-05": {
    label: "Teachers' Day",
    image: "https://img.icons8.com/color/96/classroom.png",
  },
  "10-31": {
    label: "Halloween",
    image: "https://img.icons8.com/color/96/halloween.png",
  },
  "11-14": {
    label: "Children's Day",
    image: "https://img.icons8.com/color/96/kid.png",
  },
  "12-25": {
    label: "Christmas",
    image: "https://img.icons8.com/color/96/christmas.png",
  },
};

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthDayKey(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function compareDates(a: Date, b: Date): number {
  return startOfDay(a).getTime() - startOfDay(b).getTime();
}

function clampYear(year: number): number {
  return Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));
}

function diffDaysInclusive(start: Date | null, end: Date | null): number {
  if (!start || !end) {
    return 0;
  }

  const a = startOfDay(start).getTime();
  const b = startOfDay(end).getTime();
  const distance = Math.abs(b - a) / (24 * 60 * 60 * 1000);
  return Math.floor(distance) + 1;
}

function getMonthGrid(baseDate: Date): DayCell[] {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      inCurrentMonth: date.getMonth() === month,
    };
  });
}

function getHolidayInfo(date: Date, holidayMap: Record<string, HolidayInfo>): HolidayInfo | null {
  return holidayMap[getMonthDayKey(date)] ?? null;
}

function parseIndiaHolidayIcs(rawIcs: string, year: number): Record<string, HolidayInfo> {
  const events = rawIcs.split("BEGIN:VEVENT").slice(1);
  const nextHolidayMap: Record<string, HolidayInfo> = {
    ...FALLBACK_HOLIDAY_MAP,
  };

  for (const event of events) {
    const dateMatch = event.match(/DTSTART(?:;[^:]*)?:(\d{8})/);
    const summaryMatch = event.match(/SUMMARY:(.+)/);
    if (!dateMatch || !summaryMatch) {
      continue;
    }

    const rawDate = dateMatch[1];
    const eventYear = Number(rawDate.slice(0, 4));
    if (eventYear !== year) {
      continue;
    }

    const month = rawDate.slice(4, 6);
    const day = rawDate.slice(6, 8);
    const key = `${month}-${day}`;
    const label = summaryMatch[1]
      .trim()
      .replace(/\\,/g, ",")
      .replace(/\\n/g, " ")
      .replace(/\\/g, "");

    const fallbackImage = FALLBACK_HOLIDAY_MAP[key]?.image;
    const image =
      fallbackImage ||
      `https://source.unsplash.com/300x300/?${encodeURIComponent(`${label} india festival`)}`;

    nextHolidayMap[key] = {
      label,
      image,
    };
  }

  return nextHolidayMap;
}

export default function Home() {
  const cardRef = useRef<HTMLElement | null>(null);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [displayDate, setDisplayDate] = useState(new Date(today));
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [monthlyNotes, setMonthlyNotes] = useState<Record<string, string>>({});
  const [rangeNotes, setRangeNotes] = useState<Record<string, string>>({});
  const [holidayMap, setHolidayMap] = useState<Record<string, HolidayInfo>>(FALLBACK_HOLIDAY_MAP);
  const [exporting, setExporting] = useState<"image" | "pdf" | "share" | null>(null);
  const [themeIndex, setThemeIndex] = useState(0);
  const [flipClass, setFlipClass] = useState<"" | "calendar-flip-next" | "calendar-flip-prev">("");
  const [isCompactHeader, setIsCompactHeader] = useState(false);

  const activeTheme = THEME_PRESETS[themeIndex];

  const monthKey = getMonthKey(displayDate);
  const yearOptions = useMemo(
    () => Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i),
    [],
  );
  const monthGrid = useMemo(() => getMonthGrid(displayDate), [displayDate]);
  const monthName = new Intl.DateTimeFormat("en-US", {
    month: isCompactHeader ? "short" : "long",
    year: "numeric",
  }).format(displayDate);

  const orderedRange = useMemo(() => {
    if (!rangeStart || !rangeEnd) {
      return { start: rangeStart, end: rangeEnd };
    }
    return compareDates(rangeStart, rangeEnd) <= 0
      ? { start: rangeStart, end: rangeEnd }
      : { start: rangeEnd, end: rangeStart };
  }, [rangeStart, rangeEnd]);

  const rangeKey = orderedRange.start && orderedRange.end
    ? `${toIso(orderedRange.start)}_${toIso(orderedRange.end)}`
    : "";
  const selectedDays = diffDaysInclusive(orderedRange.start, orderedRange.end);
  const selectedYear = displayDate.getFullYear();
  const selectedMonth = displayDate.getMonth();

  useEffect(() => {
    try {
      const storedMonthNotes = localStorage.getItem("calendar-month-notes");
      const storedRangeNotes = localStorage.getItem("calendar-range-notes");

      if (storedMonthNotes) {
        setMonthlyNotes(JSON.parse(storedMonthNotes));
      }
      if (storedRangeNotes) {
        setRangeNotes(JSON.parse(storedRangeNotes));
      }
    } catch {
      setMonthlyNotes({});
      setRangeNotes({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("calendar-month-notes", JSON.stringify(monthlyNotes));
  }, [monthlyNotes]);

  useEffect(() => {
    localStorage.setItem("calendar-range-notes", JSON.stringify(rangeNotes));
  }, [rangeNotes]);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) {
        clearTimeout(flipTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const checkCompactHeader = () => {
      setIsCompactHeader(window.innerWidth <= 430);
    };

    checkCompactHeader();
    window.addEventListener("resize", checkCompactHeader);
    return () => window.removeEventListener("resize", checkCompactHeader);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHolidays = async () => {
      try {
        const year = displayDate.getFullYear();
        const response = await fetch(INDIA_HOLIDAYS_FEED_URL);

        if (!response.ok) {
          throw new Error(`Holiday API returned ${response.status}`);
        }
        const icsText = await response.text();
        const nextHolidayMap = parseIndiaHolidayIcs(icsText, year);

        if (!cancelled) {
          setHolidayMap(nextHolidayMap);
        }
      } catch {
        if (!cancelled) {
          setHolidayMap(FALLBACK_HOLIDAY_MAP);
        }
      }
    };

    void loadHolidays();

    return () => {
      cancelled = true;
    };
  }, [displayDate]);

  const triggerFlip = (direction: "next" | "prev") => {
    const nextClass = direction === "next" ? "calendar-flip-next" : "calendar-flip-prev";
    setFlipClass(nextClass);
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
    }
    flipTimerRef.current = setTimeout(() => {
      setFlipClass("");
    }, 420);
  };

  const selectDate = (selected: Date) => {
    const clicked = startOfDay(selected);

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(clicked);
      setRangeEnd(null);
      return;
    }

    if (compareDates(clicked, rangeStart) === 0) {
      setRangeStart(clicked);
      setRangeEnd(clicked);
      return;
    }

    setRangeEnd(clicked);
  };

  const clearSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
  };

  const buildExportName = (extension: "png" | "pdf") => {
    const base = rangeKey || monthKey;
    return `calendar_${base}.${extension}`;
  };

  const waitForRenderableUI = async () => {
    if (typeof document !== "undefined" && "fonts" in document) {
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
    }

    const images = Array.from(document.images);
    await Promise.all(
      images.map(async (img) => {
        if (img.complete) {
          return;
        }
        try {
          await img.decode();
        } catch {
          return;
        }
      }),
    );

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  };

  const captureCardCanvas = async () => {
    if (!cardRef.current) {
      return null;
    }

    await waitForRenderableUI();
    const rect = cardRef.current.getBoundingClientRect();

    return html2canvas(cardRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      removeContainer: true,
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      x: 0,
      y: 0,
      onclone: (documentClone) => {
        const exportStyle = documentClone.createElement("style");
        exportStyle.textContent = `
          * { animation: none !important; transition: none !important; }
          .calendar-shell, .calendar-stage, .calendar-card, .calendar-main, .notes-panel, .calendar-hero {
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
          }
        `;
        documentClone.head.appendChild(exportStyle);

        const clonedCard = documentClone.querySelector(".calendar-card") as HTMLElement | null;
        if (clonedCard) {
          clonedCard.style.opacity = "1";
          clonedCard.style.animation = "none";
          clonedCard.style.transform = "none";
          clonedCard.style.filter = "none";
          clonedCard.style.boxShadow = "0 16px 40px rgba(16, 33, 53, 0.14)";
        }
      },
    });
  };

  const exportAsImage = async () => {
    try {
      setExporting("image");
      const canvas = await captureCardCanvas();
      if (!canvas) {
        return;
      }

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = buildExportName("png");
      link.click();
    } finally {
      setExporting(null);
    }
  };

  const exportAsPdf = async () => {
    try {
      setExporting("pdf");
      const canvas = await captureCardCanvas();
      if (!canvas) {
        return;
      }

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const width = canvas.width * ratio;
      const height = canvas.height * ratio;
      const x = (pageWidth - width) / 2;
      const y = 24;

      pdf.addImage(imageData, "PNG", x, y, width, height);
      pdf.save(buildExportName("pdf"));
    } finally {
      setExporting(null);
    }
  };

  const shareSnapshot = async () => {
    if (!("share" in navigator)) {
      await exportAsImage();
      return;
    }

    try {
      setExporting("share");
      const canvas = await captureCardCanvas();
      if (!canvas) {
        return;
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), "image/png");
      });

      if (!blob) {
        return;
      }

      const file = new File([blob], buildExportName("png"), { type: "image/png" });
      const canShareFiles =
        "canShare" in navigator &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });

      if (canShareFiles) {
        await navigator.share({
          title: "Calendar Snapshot",
          text: "Selected range and notes",
          files: [file],
        });
      } else {
        await exportAsImage();
      }
    } finally {
      setExporting(null);
    }
  };

  const shiftMonth = (step: number) => {
    triggerFlip(step >= 0 ? "prev" : "next");
    setDisplayDate((previous) => {
      const next = new Date(previous.getFullYear(), previous.getMonth() + step, 1);
      return new Date(clampYear(next.getFullYear()), next.getMonth(), 1);
    });
  };

  const updateYear = (year: number) => {
    setDisplayDate((previous) => {
      return new Date(clampYear(year), previous.getMonth(), 1);
    });
  };

  const updateMonth = (month: number) => {
    setDisplayDate((previous) => {
      return new Date(previous.getFullYear(), month, 1);
    });
  };

  const shiftTheme = (step: number) => {
    setThemeIndex((previous) => {
      const total = THEME_PRESETS.length;
      return (previous + step + total) % total;
    });
  };

  return (
    <div className={`calendar-shell theme-${activeTheme.id}`}>
      <main className="calendar-stage">
        <section className="calendar-card" ref={cardRef}>
          <div className="calendar-hanger" aria-hidden="true">
            {Array.from({ length: 22 }, (_, i) => (
              <span key={i} className="calendar-ring" />
            ))}
          </div>

          <header className="calendar-hero">
            <div
              className="calendar-hero-photo"
              style={{
                backgroundImage: `linear-gradient(rgba(10, 29, 53, 0.2), rgba(10, 29, 53, 0.35)), url(${activeTheme.image})`,
              }}
            />
            <div className="calendar-hero-meta">
              <p className="calendar-year">{activeTheme.year}</p>
              <h1>{activeTheme.title}</h1>
              <p>{activeTheme.subtitle}</p>
            </div>
          </header>

          <section className={`calendar-main ${flipClass}`}>
            <div className="calendar-head">
              <button type="button" onClick={() => shiftMonth(-1)}>
                Prev
              </button>
              <h2>{monthName}</h2>
              <button type="button" onClick={() => shiftMonth(1)}>
                Next
              </button>
            </div>

            <div className="calendar-controls">
              <label>
                Month
                <select
                  value={selectedMonth}
                  onChange={(event) => updateMonth(Number(event.target.value))}
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Year
                <select
                  value={selectedYear}
                  onChange={(event) => updateYear(Number(event.target.value))}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="theme-switch" aria-label="Image themes">
              <button type="button" className="theme-nav-btn" onClick={() => shiftTheme(-1)} aria-label="Previous theme">
                &lt;
              </button>
              <p className="theme-name">{activeTheme.name} Theme</p>
              <button type="button" className="theme-nav-btn" onClick={() => shiftTheme(1)} aria-label="Next theme">
                &gt;
              </button>
            </div>

            <div className="status-ribbon status-ribbon--with-action" aria-live="polite">
              <span className="status-count">
                <strong>{selectedDays}</strong>
                <em>Days Selected</em>
              </span>
              <button
                type="button"
                className="status-clear-btn"
                onClick={clearSelection}
                disabled={!rangeKey}
                aria-disabled={!rangeKey}
              >
                Clear Range
              </button>
            </div>

            <div className="calendar-grid-head" role="row">
              {WEEK_DAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="calendar-grid" role="grid" aria-label="Date selection grid">
              {monthGrid.map(({ date, inCurrentMonth }) => {
                const dayIndex = (date.getDay() + 6) % 7;
                const holidayInfo = inCurrentMonth ? getHolidayInfo(date, holidayMap) : null;
                const isToday = compareDates(date, today) === 0;
                const isStart = !!orderedRange.start && compareDates(date, orderedRange.start) === 0;
                const isEnd = !!orderedRange.end && compareDates(date, orderedRange.end) === 0;
                const isSingleLocked = isStart && !orderedRange.end;
                const isWeekend = dayIndex >= 5;
                const isBetween =
                  !!orderedRange.start &&
                  !!orderedRange.end &&
                  compareDates(date, orderedRange.start) > 0 &&
                  compareDates(date, orderedRange.end) < 0;

                const classNames = [
                  "day-cell",
                  inCurrentMonth ? "" : "day-cell--outside",
                  isWeekend ? "day-cell--weekend" : "",
                  holidayInfo ? "day-cell--holiday day-cell--holiday-image" : "",
                  isToday ? "day-cell--today" : "",
                  isBetween ? "day-cell--between" : "",
                  isSingleLocked ? "day-cell--single" : "",
                  isStart ? "day-cell--start" : "",
                  isEnd ? "day-cell--end" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={toIso(date)}
                    type="button"
                    className={classNames}
                    onClick={() => selectDate(date)}
                    title={holidayInfo?.label ?? undefined}
                    aria-pressed={isStart || isEnd || isBetween}
                    style={
                      holidayInfo
                        ? ({ "--holiday-image": `url(${holidayInfo.image})` } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <span className="day-cell-inner">
                      {date.getDate()}
                      {holidayInfo ? <i className="holiday-dot" aria-hidden="true" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="calendar-export-actions">
              <button
                type="button"
                className="export-btn"
                onClick={exportAsImage}
                disabled={!rangeKey || exporting !== null}
              >
                {exporting === "image" ? "Exporting..." : "Export Image"}
              </button>
              <button
                type="button"
                className="export-btn"
                onClick={exportAsPdf}
                disabled={!rangeKey || exporting !== null}
              >
                {exporting === "pdf" ? "Exporting..." : "Export PDF"}
              </button>
              <button
                type="button"
                className="export-btn"
                onClick={shareSnapshot}
                disabled={!rangeKey || exporting !== null}
              >
                {exporting === "share" ? "Sharing..." : "Share"}
              </button>
            </div>
          </section>

          <aside className="notes-panel">
            <div className="notes-split">
              <div className="notes-section" aria-label="Monthly notes">
                <h3>Monthly Notes</h3>
                <p>Keep strategic reminders for this month.</p>
                <div className="note-meta">
                  <button
                    type="button"
                    className="note-clear-btn"
                    onClick={() =>
                      setMonthlyNotes((previous) => ({
                        ...previous,
                        [monthKey]: "",
                      }))
                    }
                    disabled={!(monthlyNotes[monthKey] ?? "").length}
                  >
                    Clear Text
                  </button>
                </div>
                <div className="note-editor">
                  <textarea
                    value={monthlyNotes[monthKey] ?? ""}
                    onChange={(event) =>
                      setMonthlyNotes((previous) => ({
                        ...previous,
                        [monthKey]: event.target.value,
                      }))
                    }
                    placeholder="Kickoff meetings, targets, procurement windows..."
                  />
                </div>
              </div>

              <div className="notes-section" aria-label="Range memo">
                <h3>Selected Range Memo</h3>
                <p className="range-memo-status">
                  {rangeKey
                    ? `Tracking ${toIso(orderedRange.start as Date)} to ${toIso(orderedRange.end as Date)}`
                    : "Select a start and end date to attach a focused note."}
                </p>
                <div className="note-meta">
                  <button
                    type="button"
                    className="note-clear-btn"
                    onClick={() => {
                      if (!rangeKey) {
                        return;
                      }

                      setRangeNotes((previous) => ({
                        ...previous,
                        [rangeKey]: "",
                      }));
                    }}
                    disabled={!rangeKey || !(rangeNotes[rangeKey] ?? "").length}
                  >
                    Clear Text
                  </button>
                </div>
                <div className="note-editor">
                  <textarea
                    value={rangeKey ? rangeNotes[rangeKey] ?? "" : ""}
                    onChange={(event) => {
                      if (!rangeKey) {
                        return;
                      }

                      setRangeNotes((previous) => ({
                        ...previous,
                        [rangeKey]: event.target.value,
                      }));
                    }}
                    placeholder="Milestones, owners, dependencies..."
                    disabled={!rangeKey}
                  />
                </div>
              </div>
            </div>

            <div className="notes-actions">
              <p>Data is automatically saved in your browser.</p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
