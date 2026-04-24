import { useState, useRef, useEffect } from "react";
import { colors, fonts, space, radius } from "../../tokens";
import { Sun, Moon } from "lucide-react";
import type { TariffBand } from "../../../scenarios/types";

/**
 * Returns the tariff rate and colour tier for a given hour (0–23) by
 * scanning the scenario's tariffSchedule. 'to: 00:00' is treated as
 * end-of-day (hour 24). Falls back to 17p / mid if no band matches.
 */
function findTariffForHour(
  h: number,
  schedule: TariffBand[]
): { ratePence: number; tier: "low" | "mid" | "high" } {
  const band = schedule.find((b) => {
    const fromH = parseInt(b.from.split(":")[0], 10);
    const toH = b.to === "00:00" ? 24 : parseInt(b.to.split(":")[0], 10);
    return h >= fromH && h < toH;
  });
  const ratePence = band?.ratePence ?? 17;
  const tier: "low" | "mid" | "high" =
    ratePence < 15 ? "low" : ratePence <= 25 ? "mid" : "high";
  return { ratePence, tier };
}

interface TemporalNavProps {
  variant: "solid" | "hatched"; // solid for A/B, hatched for C/D
  onDayChange?: (dayInfo: { date: string; isToday: boolean; isPast: boolean; isFuture: boolean }) => void;
  showCausalContext?: boolean; // Show causal context lines in tooltips (for B, C, D)
  /** scenario.weather string — overrides the current day's weather icon only. */
  weatherDescription?: string;
  /** scenario.hourlySOC — 24-element array that drives today's Battery tab chart.
   *  Other days continue to use the illustrative mock trajectory. */
  hourlySOC?: number[];
  /** scenario.tariffSchedule — used to derive per-hour tariff values for today.
   *  Other days continue to use the illustrative mock (off-peak/peak split). */
  tariffSchedule?: TariffBand[];
  /** scenario.hourlyCarbon — 24-element array (gCO₂/kWh) for today's CO₂ strip.
   *  Other days continue to use the illustrative mock carbon values. */
  hourlyCarbon?: number[];
  /** scenario.hourlySolar — 24-element array (kWh) for today's Energy flow solar bars.
   *  Other days continue to use the illustrative mock solar profile. */
  hourlySolar?: number[];
  /** scenario.hourlyConsumption — 24-element array (kWh) for today's Energy flow consumption bars.
   *  Other days continue to use the illustrative mock consumption profile. */
  hourlyConsumption?: number[];
  /** Pre-computed 24-element net grid flow array (kWh) for today, derived via
   *  computeHourlyGridFlow(). Positive = import, negative = export.
   *  Other days continue to use the illustrative mock grid flow. */
  hourlyGridFlow?: number[];
}

interface HourData {
  solar: number; // kWh generated
  consumption: number; // kWh consumed
  priceKwh: number; // £/kWh
  priceTier: "low" | "mid" | "high";
  isRetrospective: boolean;
  confidence?: number; // 0-1, only used for forecast in C/D
  soc: number; // Battery state of charge %
}

interface DayData {
  label: string;
  date: string; // ISO date string for comparison (e.g. "2026-04-16")
  solarPotential: "high" | "mid" | "low";
  hours: HourData[];
  sunriseTime: number; // Fractional hour when sunrise occurs (e.g. 6.3 for 06:18)
  sunsetTime: number; // Fractional hour when sunset occurs (e.g. 19.7 for 19:42)
}

/**
 * TemporalNav — Two-tier temporal navigation (DR1).
 * Tier 1: 7-day overview strip with solar potential color bands (BBC Weather pattern).
 * Tier 2: Horizontal hourly data grid with 24 columns (00:00–23:00), each containing:
 *   - Solar generation bar (vertical, orange)
 *   - Consumption bar (vertical, purple)
 *   - Grid price tier badge
 *   - Hour label at top
 *   - SOC line overlay
 *   - Sunset marker (vertical dotted line)
 *   - AI CHARGE marker (vertical dashed line with shaded region)
 *   - Dark grey forecast bars (background element for nighttime hours)
 * 
 * Variant prop determines forecast encoding:
 * - "solid" (A/B): retrospective = full opacity, forecast = 40% opacity
 * - "hatched" (C/D): retrospective = full opacity, forecast = diagonal hatch with confidence-based opacity/density
 */
export function TemporalNav({ variant, onDayChange, showCausalContext = false, weatherDescription, hourlySOC, tariffSchedule, hourlyCarbon, hourlySolar, hourlyConsumption, hourlyGridFlow }: TemporalNavProps) {
  // Layout constants for column-based positioning
  const COLUMN_GAP = 8; // gap between columns in px (corresponds to space[2])
  
  // Refs for measuring container width
  const stripContainerRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState(56); // Initial approximate value
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"energy" | "battery" | "grid">("energy");
  
  // Tooltip state
  const [tooltipHour, setTooltipHour] = useState<number | null>(null);

  // Calculate responsive column width on mount and resize
  useEffect(() => {
    const updateColumnWidth = () => {
      if (stripContainerRef.current) {
        const stripWidth = stripContainerRef.current.offsetWidth;
        const calculatedWidth = (stripWidth - (24 - 1) * COLUMN_GAP) / 24;
        setColumnWidth(calculatedWidth);
      }
    };

    updateColumnWidth();
    
    const resizeObserver = new ResizeObserver(updateColumnWidth);
    if (stripContainerRef.current) {
      resizeObserver.observe(stripContainerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, []);
  
  // Derive current time from system clock
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinuteFraction = now.getMinutes() / 60;
  
  // Today's date
  const today = now;
  const todayISO = today.toISOString().split('T')[0];

  // Calculate week start (Monday) and generate 7 days
  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust for Sunday (0) or Monday-Saturday
    d.setDate(d.getDate() + diff);
    return d;
  };

  const weekStart = getMonday(today);
  
  const weekDays: string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Mock SOC data for battery tab (24 hours)
  // Pattern: gradual overnight decline, solar recovery, AI charge 14:00-16:00, evening decline
  // 00:00-13:00: 25% -> 15% -> 37%, 14:00-16:00: 37% -> 100%, 16:00-23:00: 100% -> 75%
  const mockSOCDataBase = [
    25, 23, 20, 18, 15, 14, // 00:00-05:00: overnight decline to 14%
    17, 20, 24, 28, 32, 35, 37, // 06:00-12:00: solar recovery to 37%
    37, // 13:00: holding at 37%
    50, 75, 100, // 14:00-16:00: charging period (37% -> 100%)
    98, 95, 92, 88, 84, 80, 77 // 17:00-23:00: evening decline to 77%
  ];
  const mockSOCData = mockSOCDataBase;

  // Generate 7 days of data based on actual dates
  const generateDayData = (date: Date, socOverride?: number[], tariffOverride?: TariffBand[], solarOverride?: number[], consumptionOverride?: number[]): DayData => {
    const dateISO = date.toISOString().split('T')[0];
    const dayName = weekDays[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Map Sunday (0) to index 6
    const dayNum = date.getDate();
    const label = `${dayName} ${dayNum}`;

    // Solar potential pattern (mock data)
    const dayOfWeek = date.getDay();
    const solarPotentials: Array<"high" | "mid" | "low"> = [
      "high", // Mon
      "high", // Tue
      "mid",  // Wed
      "mid",  // Thu
      "low",  // Fri
      "low",  // Sat
      "low",  // Sun
    ];
    const solarPotential = solarPotentials[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

    const isToday = dateISO === todayISO;
    const isPast = date < today;
    const isFuture = date > today;

    const hours: HourData[] = Array.from(
      { length: 24 },
      (_, h) => {
        const isRetrospective =
          isPast || (isToday && h <= currentHour);
        const isForecast = !isRetrospective;

        // Solar generation: use scenario data for today, else illustrative mock
        let solar: number;
        if (solarOverride) {
          solar = solarOverride[h] ?? 0;
        } else {
          // Illustrative mock: ramp-up pattern scaled by solar potential
          let mockSolar = 0;
          if (h === 6) mockSolar = 0.3;
          else if (h === 7) mockSolar = 0.4;
          else if (h === 8) mockSolar = 0.5;
          else if (h === 9) mockSolar = 1.0;
          else if (h === 10) mockSolar = 1.5;
          else if (h === 11) mockSolar = 1.8;
          else if (h === 12) mockSolar = 2.2;
          else if (h === 13) mockSolar = 2.5;
          else if (h === 14) mockSolar = 2.7;
          else if (h === 15) mockSolar = 2.6;
          else if (h === 16) mockSolar = 1.2;
          else if (h === 17) mockSolar = 0.8;
          solar = mockSolar * (solarPotential === "high" ? 1.0 : solarPotential === "mid" ? 0.8 : 0.5);
        }

        // Consumption: use scenario data for today, else illustrative mock
        let consumption: number;
        if (consumptionOverride) {
          consumption = consumptionOverride[h] ?? 0;
        } else {
          // Illustrative mock: morning + evening peaks
          const consumptionBase =
            1.5 +
            Math.sin(((h - 8) / 16) * Math.PI) * 1.2 +
            (h >= 18 && h <= 21 ? 2 : 0);
          consumption = Math.min(2.7, consumptionBase);
        }

        // Grid pricing: derive from scenario tariffSchedule when provided, else illustrative mock
        let priceKwh: number;
        let priceTier: "low" | "mid" | "high";
        if (tariffOverride) {
          const tf = findTariffForHour(h, tariffOverride);
          priceKwh = tf.ratePence / 100;
          priceTier = tf.tier;
        } else {
          priceKwh = h < 18 ? 0.1 : 0.35;
          priceTier = h < 18 ? "low" : "high";
        }

        // Confidence degrades for longer-term forecasts
        const daysDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const hoursIntoFuture = isForecast
          ? daysDiff * 24 + (h - currentHour)
          : 0;
        const confidence = isForecast
          ? Math.max(0.3, 1 - hoursIntoFuture / 120)
          : 1;

        // Battery SOC: use scenario's hourlySOC when provided, else illustrative mock
        const soc = socOverride ? (socOverride[h] ?? mockSOCData[h]) : mockSOCData[h];

        return {
          solar,
          consumption,
          priceKwh,
          priceTier,
          isRetrospective,
          confidence,
          soc,
        };
      },
    );

    const sunriseTime = 6.3; // Sunrise at 06:18
    const sunsetTime = 19.7; // Sunset at 19:42

    return {
      label,
      date: dateISO,
      solarPotential,
      hours,
      sunriseTime,
      sunsetTime,
    };
  };

  const allDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateISO = date.toISOString().split('T')[0];
    const isToday = dateISO === todayISO;
    // Pass scenario data only for today; other days stay illustrative
    return generateDayData(
      date,
      isToday ? hourlySOC : undefined,
      isToday ? tariffSchedule : undefined,
      isToday ? hourlySolar : undefined,
      isToday ? hourlyConsumption : undefined,
    );
  });

  // Find today's index in the week
  const todayIndex = allDays.findIndex(day => day.date === todayISO);
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);

  const selectedDay = allDays[selectedDayIndex];
  const isTodaySelected = selectedDay.date === todayISO;

  // Determine if selected day is past or future
  const selectedDate = new Date(selectedDay.date);
  const isPastDay = selectedDate < new Date(todayISO);
  const isFutureDay = selectedDate > new Date(todayISO);

  // Notify parent when selected day changes
  useEffect(() => {
    if (onDayChange) {
      onDayChange({
        date: selectedDay.date,
        isToday: isTodaySelected,
        isPast: isPastDay,
        isFuture: isFutureDay,
      });
    }
  }, [selectedDayIndex, selectedDay.date, isTodaySelected, isPastDay, isFutureDay, onDayChange]);

  // Weather icon mapping based on solar potential
  const weatherIcons: Record<string, JSX.Element> = {
    high: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
    mid: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
      </svg>
    ),
    low: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
      </svg>
    ),
  };

  // Override icon for today derived from scenario.weather (Issue 1 fix).
  // Only today's card uses this; all other days keep the solarPotential-based icon.
  const todayWeatherIcon: JSX.Element | null = (() => {
    if (!weatherDescription) return null;
    const lower = weatherDescription.toLowerCase();
    if (lower.includes('clear') || lower.includes('sunny')) return weatherIcons['high'];
    if (lower.includes('cloud')) return weatherIcons['mid'];
    return null; // unknown value → fall through to solarPotential icon
  })();

  const priceTierColors = {
    low: "#5CB85C", // green
    mid: "#E8971A", // amber
    high: "#E57373", // red
  };

  // Fixed 5 kWh when today is shown with scenario data, ensuring a consistent
  // visual scale across all three scenarios for evaluation validity.
  // Non-today days use 3 kWh (illustrative mock data peaks at ~2.7 kWh).
  const maxEnergy = isTodaySelected && (hourlySolar || hourlyConsumption) ? 5 : 3;
  // Helper: format a kWh label, stripping trailing ".0"
  const kwhLabel = (val: number) =>
    `${val % 1 === 0 ? val : val.toFixed(1)} kWh`;
  const GRID_MAX_IMPORT = 6;  // kWh: top of grid axis (import ceiling)
  const GRID_MAX_EXPORT = 3;  // kWh: bottom of grid axis (export floor, as magnitude)
  const barContainerHeight = 240; // Plot area height in px
  // Zero line sits at 6/9 of the way down (import zone = 160 px, export zone = 80 px)
  const gridZeroY = barContainerHeight * GRID_MAX_IMPORT / (GRID_MAX_IMPORT + GRID_MAX_EXPORT);

  // AI charging window
  const chargeStartHour = 14;
  const chargeEndHour = 16;
  
  // Handle click outside to dismiss tooltip
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-hour-column]') && !target.closest('[data-tooltip]')) {
        setTooltipHour(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div style={{ marginBottom: space[6], width: "100%", minWidth: 0 }}>
      {/* Tier 1: 7-day overview */}
      <div
        style={{
          display: "flex",
          gap: space[2],
          marginBottom: space[4],
        }}
      >
        {allDays.map((day, i) => (
          <button
            key={day.label}
            onClick={() => setSelectedDayIndex(i)}
            style={{
              flex: 1,
              padding: space[2],
              borderRadius: radius.md,
              border: `1px solid ${colors.border.default}`,
              backgroundColor: "transparent",
              cursor: "pointer",
              position: "relative",
              paddingBottom: space[3],
              borderBottom: i === selectedDayIndex ? `3px solid ${colors.ai.decision}` : `1px solid ${colors.border.default}`,
            }}
          >
            <div
              style={{
                fontFamily: fonts.family.sans,
                fontSize: fonts.size.sm,
                fontWeight:
                  i === selectedDayIndex
                    ? fonts.weight.semibold
                    : fonts.weight.regular,
                color:
                  i === selectedDayIndex
                    ? colors.text.primary
                    : colors.text.secondary,
                textAlign: "center",
                marginBottom: 6,
              }}
            >
              {day.label}
            </div>
            {/* Weather icon — today uses scenario-derived icon, others use solarPotential */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {day.date === todayISO && todayWeatherIcon
                ? todayWeatherIcon
                : weatherIcons[day.solarPotential]}
            </div>
          </button>
        ))}
      </div>

      {/* Tier 2: Horizontal hourly data grid with overlays */}
      <div
        style={{
          backgroundColor: colors.bg.surface,
          border: `1px solid ${colors.border.default}`,
          borderRadius: radius.lg,
          padding: space[3],
          width: "100%",
          minWidth: 0,
          overflow: "visible",
        }}
      >
        {/* Tab row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: space[3],
            borderBottom: `1px solid ${colors.border.subtle}`,
          }}
        >
          {[
            { key: "energy", label: "Energy flow" },
            { key: "battery", label: "Battery" },
            { key: "grid", label: "Grid" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              style={{
                fontFamily: fonts.family.sans,
                fontSize: fonts.size.sm,
                fontWeight: fonts.weight.medium,
                color:
                  activeTab === tab.key
                    ? colors.text.primary
                    : colors.text.secondary,
                backgroundColor: "transparent",
                border: "none",
                cursor: "pointer",
                padding: `${space[2]}px 0`,
                borderBottom:
                  activeTab === tab.key
                    ? `2px solid ${colors.text.primary}`
                    : "2px solid transparent",
                marginBottom: -1,
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main chart area with bars */}
        <div style={{ display: "flex", gap: space[3], width: "100%", minWidth: 0 }}>
          {/* Y-axis labels column */}
          <div
            style={{
              width: 28,
              position: "relative",
              height: barContainerHeight,
              flexShrink: 0,
              marginTop: selectedDayIndex === todayIndex ? (14 + 2 + 18 + 4 + 20 + 4) : (20 + 4), // Align with plot area (Row 4)
            }}
          >
            {activeTab === "energy" && (
              <>
                <div style={{ position: "absolute", top: 0, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>{kwhLabel(maxEnergy)}</div>
                <div style={{ position: "absolute", top: barContainerHeight * 0.33, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>{kwhLabel(Math.round(maxEnergy * 2 / 3 * 10) / 10)}</div>
                <div style={{ position: "absolute", top: barContainerHeight * 0.67, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>{kwhLabel(Math.round(maxEnergy / 3 * 10) / 10)}</div>
                <div style={{ position: "absolute", top: barContainerHeight, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>0 kWh</div>
              </>
            )}
            {activeTab === "battery" && (
              <>
                <div style={{ position: "absolute", top: 0, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>100%</div>
                <div style={{ position: "absolute", top: barContainerHeight * 0.25, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>75%</div>
                <div style={{ position: "absolute", top: barContainerHeight * 0.5, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>50%</div>
                <div style={{ position: "absolute", top: barContainerHeight * 0.75, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>25%</div>
                <div style={{ position: "absolute", top: barContainerHeight, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>0%</div>
              </>
            )}
            {activeTab === "grid" && (
              <>
                {/* Import side: 0 to +6 kWh across gridZeroY (160 px) */}
                <div style={{ position: "absolute", top: 0, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>+6 kWh</div>
                <div style={{ position: "absolute", top: gridZeroY / 3, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>+4 kWh</div>
                <div style={{ position: "absolute", top: gridZeroY * 2 / 3, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>+2 kWh</div>
                <div style={{ position: "absolute", top: gridZeroY, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>0</div>
                {/* Export side: 0 to −3 kWh across the remaining 80 px */}
                <div style={{ position: "absolute", top: gridZeroY + (barContainerHeight - gridZeroY) / 3, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>−1 kWh</div>
                <div style={{ position: "absolute", top: gridZeroY + (barContainerHeight - gridZeroY) * 2 / 3, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>−2 kWh</div>
                <div style={{ position: "absolute", top: barContainerHeight, right: 0, fontFamily: fonts.family.sans, fontSize: 9, color: "#9CA3AF", textAlign: "right", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>−3 kWh</div>
              </>
            )}
          </div>

          {/* Bars and overlays container */}
          <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
            {/* Row 1: NOW label row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
                gap: COLUMN_GAP,
                width: "100%",
                minWidth: 0,
                height: selectedDayIndex === todayIndex ? 14 : 0,
                marginBottom: selectedDayIndex === todayIndex ? 2 : 0,
                position: "relative",
                zIndex: 10,
              }}
            >
              {selectedDayIndex === todayIndex && selectedDay.hours.map((_, h) => {
                const isCurrentHour = h === currentHour;

                return (
                  <div
                    key={`now-label-${h}`}
                    style={{
                      minWidth: 0,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    {isCurrentHour && (
                      <div
                        style={{
                          fontFamily: fonts.family.sans,
                          fontSize: 11,
                          fontWeight: fonts.weight.semibold,
                          color: "#F59E0B",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        NOW
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Row 2: CHARGING/CHARGED pill row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
                gap: COLUMN_GAP,
                width: "100%",
                minWidth: 0,
                height: selectedDayIndex === todayIndex ? 18 : 0,
                marginBottom: selectedDayIndex === todayIndex ? 4 : 0,
                position: "relative",
                zIndex: 10,
              }}
            >
              {selectedDayIndex === todayIndex && selectedDay.hours.map((_, h) => {
                const isChargeStartHour = h === chargeStartHour;
                const showChargingPill = currentHour >= chargeStartHour && currentHour < chargeEndHour;
                const showChargedPill = currentHour >= chargeEndHour;

                return (
                  <div
                    key={`charging-pill-${h}`}
                    style={{
                      minWidth: 0,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      position: "relative",
                    }}
                  >
                    {isChargeStartHour && showChargingPill && (
                      <div
                        style={{
                          fontFamily: fonts.family.sans,
                          fontSize: 9,
                          fontWeight: fonts.weight.bold,
                          color: colors.ai.decision,
                          backgroundColor: colors.bg.surface,
                          padding: "2px 6px",
                          borderRadius: radius.sm,
                          border: `1px solid ${colors.ai.decision}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        CHARGING
                      </div>
                    )}
                    {isChargeStartHour && showChargedPill && (
                      <div
                        style={{
                          fontFamily: fonts.family.sans,
                          fontSize: 9,
                          fontWeight: fonts.weight.bold,
                          color: "#2FA75A",
                          backgroundColor: colors.bg.surface,
                          padding: "2px 6px",
                          borderRadius: radius.sm,
                          border: "1px solid #2FA75A",
                          whiteSpace: "nowrap",
                        }}
                      >
                        CHARGED
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Row 3: Hour labels row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
                gap: COLUMN_GAP,
                width: "100%",
                minWidth: 0,
                marginBottom: 4,
              }}
            >
              {selectedDay.hours.map((_, h) => {
                const isNow = selectedDayIndex === todayIndex && h === currentHour;
                return (
                  <div
                    key={`hour-label-${h}`}
                    style={{
                      minWidth: 0,
                      overflow: "visible",
                      fontFamily: fonts.family.sans,
                      fontSize: fonts.size.xs,
                      fontWeight: isNow
                        ? fonts.weight.semibold
                        : fonts.weight.regular,
                      color: isNow
                        ? colors.temporal.nowMarker
                        : colors.text.secondary,
                      textAlign: "center",
                      height: 20,
                    }}
                  >
                    {h.toString().padStart(2, "0")}:00
                  </div>
                );
              })}
            </div>

            {/* Row 4: Plot area row */}
            <div
              ref={stripContainerRef}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
                gap: COLUMN_GAP,
                width: "100%",
                minWidth: 0,
                position: "relative",
              }}
            >
              {/* Horizontal gridlines - behind all content */}
              {activeTab === "energy" && (
                <>
                  <div style={{ position: "absolute", left: 0, right: 0, top: barContainerHeight * 0.33, height: 1, backgroundColor: "rgba(229, 231, 235, 0.5)", pointerEvents: "none", zIndex: 0 }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: barContainerHeight * 0.67, height: 1, backgroundColor: "rgba(229, 231, 235, 0.5)", pointerEvents: "none", zIndex: 0 }} />
                </>
              )}
              {activeTab === "battery" && (
                <>
                  <div style={{ position: "absolute", left: 0, right: 0, top: barContainerHeight * 0.25, height: 1, backgroundColor: "rgba(229, 231, 235, 0.5)", pointerEvents: "none", zIndex: 0 }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: barContainerHeight * 0.5, height: 1, backgroundColor: "rgba(229, 231, 235, 0.5)", pointerEvents: "none", zIndex: 0 }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: barContainerHeight * 0.75, height: 1, backgroundColor: "rgba(229, 231, 235, 0.5)", pointerEvents: "none", zIndex: 0 }} />
                </>
              )}
              {activeTab === "grid" && (
                <>
                  {/* Gridlines at every 2 kWh on import side and every 1 kWh on export side */}
                  <div style={{ position: "absolute", left: 0, right: 0, top: gridZeroY / 3, height: 1, backgroundColor: "rgba(229, 231, 235, 0.5)", pointerEvents: "none", zIndex: 0 }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: gridZeroY * 2 / 3, height: 1, backgroundColor: "rgba(229, 231, 235, 0.5)", pointerEvents: "none", zIndex: 0 }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: gridZeroY + (barContainerHeight - gridZeroY) / 3, height: 1, backgroundColor: "rgba(229, 231, 235, 0.5)", pointerEvents: "none", zIndex: 0 }} />
                  <div style={{ position: "absolute", left: 0, right: 0, top: gridZeroY + (barContainerHeight - gridZeroY) * 2 / 3, height: 1, backgroundColor: "rgba(229, 231, 235, 0.5)", pointerEvents: "none", zIndex: 0 }} />
                </>
              )}

              {/* Optional nighttime background tint layers - sit behind all content */}
              {(() => {
                const sunriseLeftPx = selectedDay.sunriseTime * (columnWidth + COLUMN_GAP);
                const sunsetLeftPx = selectedDay.sunsetTime * (columnWidth + COLUMN_GAP);
                const endPx = 24 * (columnWidth + COLUMN_GAP) - COLUMN_GAP;
                
                return (
                  <>
                    {/* Pre-sunrise nighttime background */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        width: sunriseLeftPx,
                        top: 0,
                        height: barContainerHeight,
                        backgroundColor: "rgba(28, 28, 30, 0.06)",
                        pointerEvents: "none",
                        zIndex: 0,
                      }}
                    />
                    {/* Post-sunset nighttime background */}
                    <div
                      style={{
                        position: "absolute",
                        left: sunsetLeftPx,
                        width: endPx - sunsetLeftPx,
                        top: 0,
                        height: barContainerHeight,
                        backgroundColor: "rgba(28, 28, 30, 0.06)",
                        pointerEvents: "none",
                        zIndex: 0,
                      }}
                    />
                  </>
                );
              })()}

              {/* AI CHARGE shaded region */}
              {selectedDayIndex === todayIndex && (() => {
                const startLeftPx = chargeStartHour * (columnWidth + COLUMN_GAP);
                const endLeftPx = chargeEndHour * (columnWidth + COLUMN_GAP);
                return (
                  <div
                    style={{
                      position: "absolute",
                      left: startLeftPx,
                      width: endLeftPx - startLeftPx,
                      top: 0,
                      height: barContainerHeight,
                      backgroundColor: "rgba(232, 151, 26, 0.08)",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  />
                );
              })()}

              {selectedDay.hours.map((hourData, h) => {
                const isNow =
                  selectedDayIndex === todayIndex &&
                  h === currentHour;
                const {
                  solar,
                  consumption,
                  priceKwh,
                  priceTier,
                  isRetrospective,
                  confidence = 1,
                } = hourData;
                
                // Determine if this hour should be rendered as past or forecast
                // Past days: all bars saturated
                // Future days: all bars at forecast opacity
                // Today: split at currentHour
                let renderAsPast = isRetrospective;
                if (isPastDay) {
                  renderAsPast = true; // All hours on past days are past
                } else if (isFutureDay) {
                  renderAsPast = false; // All hours on future days are forecast
                }

                // Calculate days ahead from today for continuous opacity gradient
                const todayDate = new Date(todayISO);
                const selectedDate = new Date(selectedDay.date);
                const daysAhead = Math.floor((selectedDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

                // Nighttime determination
                const nightStartHour = Math.floor(selectedDay.sunsetTime);
                const dayStartHour = Math.floor(selectedDay.sunriseTime);
                const isNighttime = h < dayStartHour || h >= nightStartHour;
                const isSunsetHour = h === nightStartHour;
                const isSunsetHourSplit = h === nightStartHour; // For the gradient effect within the hour (deprecated)

                // Sunrise determination
                const isSunriseHour = h === dayStartHour;

                // Forecast encoding
                const forecastOpacity =
                  variant === "solid"
                    ? 0.4
                    : confidence * 0.7 + 0.3;
                const hatchDensity =
                  variant === "hatched"
                    ? Math.floor(confidence * 4) + 2
                    : 0;

                // Bar heights - scale to plot area
                const solarHeight =
                  (solar / maxEnergy) * barContainerHeight;
                const consumptionHeight =
                  (consumption / maxEnergy) * barContainerHeight;

                return (
                  <div
                    key={h}
                    style={{
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                      zIndex: 2,
                    }}
                  >
                    {/* Sunset marker (only on nightStartHour column on current day) */}
                    {selectedDayIndex === todayIndex && isSunsetHour && (
                      <>
                        {/* Dotted vertical line */}
                        <div
                          style={{
                            position: "absolute",
                            left: -(COLUMN_GAP / 2),
                            top: 0,
                            height: barContainerHeight,
                            borderLeft: "2px dotted #9E9E9E",
                            pointerEvents: "none",
                            zIndex: 4,
                          }}
                        />
                        {/* Moon icon */}
                        <div
                          style={{
                            position: "absolute",
                            left: 4,
                            top: 6,
                            pointerEvents: "none",
                            zIndex: 4,
                          }}
                        >
                          <Moon size={16} color="#757575" strokeWidth={2.5} />
                        </div>
                      </>
                    )}

                    {/* Sunrise marker (only on dayStartHour column on current day) */}
                    {selectedDayIndex === todayIndex && isSunriseHour && (
                      <>
                        {/* Dotted vertical line */}
                        <div
                          style={{
                            position: "absolute",
                            left: -(COLUMN_GAP / 2),
                            top: 0,
                            height: barContainerHeight,
                            borderLeft: "2px dotted #9E9E9E",
                            pointerEvents: "none",
                            zIndex: 4,
                          }}
                        />
                        {/* Sun icon */}
                        <div
                          style={{
                            position: "absolute",
                            left: 4,
                            top: 6,
                            pointerEvents: "none",
                            zIndex: 4,
                          }}
                        >
                          <Sun size={16} color="#757575" strokeWidth={2.5} />
                        </div>
                      </>
                    )}

                    {/* Data section: content varies by active tab */}
                    <div
                      data-hour-column="true"
                      onClick={() => setTooltipHour(h)}
                      onMouseEnter={() => setTooltipHour(h)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: activeTab === "grid" ? "center" : "flex-end",
                        height: barContainerHeight,
                        borderRadius: radius.sm,
                        border: isNow
                          ? `2px solid ${colors.temporal.nowMarker}`
                          : `1px solid ${colors.border.subtle}`,
                        backgroundColor: colors.bg.canvas,
                        padding: 2,
                        position: "relative",
                        overflow: "visible",
                        cursor: "pointer",
                        zIndex: isNow ? 4 : 1,
                      }}
                    >
                      {activeTab === "energy" && (() => {
                        // Calculate confidence band extent for forecast hours (DR9)
                        const hoursFromNow = h - currentHour;
                        const maxHoursAhead = 23 - currentHour;
                        const bandExtentPercent = !renderAsPast && variant === "hatched" && hoursFromNow > 0
                          ? 0.15 + (hoursFromNow / maxHoursAhead) * 0.10  // 15% to 25% range
                          : 0;

                        // Calculate continuous opacity gradient based on days ahead
                        let barOpacity = 1;
                        let bandOpacity = 0.15;
                        if (!renderAsPast && variant === "hatched") {
                          if (daysAhead === 0) {
                            // Today: hours after NOW use 60% opacity
                            barOpacity = 0.6;
                            bandOpacity = 0.09;
                          } else if (daysAhead === 1) {
                            // Tomorrow (Tuesday): all hours 60% opacity
                            barOpacity = 0.6;
                            bandOpacity = 0.09;
                          } else if (daysAhead === 2) {
                            // Wednesday (2 days ahead): all hours 45% opacity
                            barOpacity = 0.45;
                            bandOpacity = 0.0675;
                          } else if (daysAhead >= 3) {
                            // Thursday-Sunday (3+ days ahead): all hours 35% opacity
                            barOpacity = 0.35;
                            bandOpacity = 0.053;
                          }
                        }

                        // Calculate band heights (only for solar)
                        const solarBandHeight = solarHeight * bandExtentPercent;

                        // Cap bands at 3 kWh gridline
                        const maxBandTop = 0; // Top of container (3 kWh)
                        const solarBandTop = Math.max(maxBandTop, barContainerHeight - solarHeight - solarBandHeight);
                        const solarBandBottom = barContainerHeight - Math.max(0, solarHeight - solarBandHeight);
                        const solarBandTotalHeight = solarBandBottom - solarBandTop;

                        return (
                          <>
                            {/* Solar confidence band (behind solar bar) - ONLY on solar, not consumption */}
                            {!renderAsPast && variant === "hatched" && hoursFromNow > 0 && (
                              <div
                                style={{
                                  width: "90%",
                                  height: solarBandTotalHeight,
                                  backgroundColor: "#E8971A",
                                  opacity: bandOpacity,
                                  borderRadius: 2,
                                  position: "absolute",
                                  bottom: barContainerHeight - solarBandBottom,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  zIndex: 0,
                                  pointerEvents: "none",
                                }}
                              />
                            )}

                            {/* Solar generation bar (orange, back layer, 90% width, centered) */}
                            <div
                              style={{
                                width: "90%",
                                height: solarHeight,
                                backgroundColor: "#E8971A",
                                opacity: renderAsPast
                                  ? 1
                                  : variant === "solid"
                                    ? 0.4
                                    : barOpacity,
                                backgroundImage:
                                  !renderAsPast &&
                                  variant === "hatched"
                                    ? `repeating-linear-gradient(
                                        45deg,
                                        transparent,
                                        transparent ${hatchDensity}px,
                                        rgba(255,255,255,0.3) ${hatchDensity}px,
                                        rgba(255,255,255,0.3) ${hatchDensity + 1}px
                                      )`
                                    : "none",
                                borderRadius: 2,
                                position: "absolute",
                                bottom: 2,
                                left: "50%",
                                transform: "translateX(-50%)",
                                zIndex: 1,
                              }}
                            />

                            {/* Consumption bar (purple, front layer, 55% width, centered, 100% opacity) */}
                            <div
                              style={{
                                width: "45%",
                                height: consumptionHeight,
                                backgroundColor: "#9B8EC4",
                                opacity: renderAsPast
                                  ? 1
                                  : variant === "solid"
                                    ? 0.4
                                    : barOpacity,
                                backgroundImage:
                                  !renderAsPast &&
                                  variant === "hatched"
                                    ? `repeating-linear-gradient(
                                        45deg,
                                        transparent,
                                        transparent ${hatchDensity}px,
                                        rgba(255,255,255,0.3) ${hatchDensity}px,
                                        rgba(255,255,255,0.3) ${hatchDensity + 1}px
                                      )`
                                    : "none",
                                borderRadius: 2,
                                position: "absolute",
                                bottom: 2,
                                left: "50%",
                                transform: "translateX(-50%)",
                                zIndex: 2,
                              }}
                            />
                          </>
                        );
                      })()}

                      {activeTab === "battery" && (
                        <>
                          {/* Battery SOC area chart is rendered as SVG overlay - see below */}
                        </>
                      )}

                      {activeTab === "grid" && (() => {
                        // Grid flow: use scenario-derived data for today, mock for other days
                        const gridValue = isTodaySelected && hourlyGridFlow
                          ? hourlyGridFlow[h]
                          : (consumption - solar);
                        const isImport = gridValue >= 0;
                        // Asymmetric height: import bars scale against gridZeroY, export against the smaller zone below
                        const gridHeight = isImport
                          ? (Math.min(gridValue, GRID_MAX_IMPORT) / GRID_MAX_IMPORT) * gridZeroY
                          : (Math.min(Math.abs(gridValue), GRID_MAX_EXPORT) / GRID_MAX_EXPORT) * (barContainerHeight - gridZeroY);

                        // Calculate confidence band extent for forecast hours (DR9)
                        const hoursFromNow = h - currentHour;
                        const maxHoursAhead = 23 - currentHour;
                        const bandExtentPercent = !renderAsPast && variant === "hatched" && hoursFromNow > 0
                          ? 0.15 + (hoursFromNow / maxHoursAhead) * 0.10  // 15% to 25% range
                          : 0;

                        // Calculate continuous opacity gradient based on days ahead
                        let gridBarOpacity = 1;
                        let gridBandOpacity = 0.15;
                        if (!renderAsPast && variant === "hatched") {
                          if (daysAhead === 0) {
                            // Today: hours after NOW use 60% opacity
                            gridBarOpacity = 0.6;
                            gridBandOpacity = 0.09;
                          } else if (daysAhead === 1) {
                            // Tomorrow (Tuesday): all hours 60% opacity
                            gridBarOpacity = 0.6;
                            gridBandOpacity = 0.09;
                          } else if (daysAhead === 2) {
                            // Wednesday (2 days ahead): all hours 45% opacity
                            gridBarOpacity = 0.45;
                            gridBandOpacity = 0.0675;
                          } else if (daysAhead >= 3) {
                            // Thursday-Sunday (3+ days ahead): all hours 35% opacity
                            gridBarOpacity = 0.35;
                            gridBandOpacity = 0.053;
                          }
                        }

                        // Calculate band height
                        const gridBandHeight = gridHeight * bandExtentPercent;
                        const gridBandTotalHeight = gridHeight + 2 * gridBandHeight;

                        // Cap bands to the relevant axis zone height
                        const maxBandExtent = isImport ? gridZeroY : (barContainerHeight - gridZeroY);
                        const cappedBandTotalHeight = Math.min(gridBandTotalHeight, maxBandExtent);

                        return (
                          <>
                            {/* Zero line reference — sits at gridZeroY (160 px from top) */}
                            <div
                              style={{
                                position: "absolute",
                                top: gridZeroY,
                                left: 0,
                                right: 0,
                                height: 1,
                                backgroundColor: "#9E9E9E",
                                zIndex: 0,
                              }}
                            />

                            {/* Grid confidence band (behind grid bar) */}
                            {!renderAsPast && variant === "hatched" && hoursFromNow > 0 && (
                              <div
                                style={{
                                  width: "90%",
                                  height: cappedBandTotalHeight,
                                  backgroundColor: "#3E5C76",
                                  opacity: gridBandOpacity,
                                  borderRadius: isImport ? "4px 4px 0 0" : "0 0 4px 4px",
                                  position: "absolute",
                                  [isImport ? "bottom" : "top"]: `${isImport ? barContainerHeight - gridZeroY : gridZeroY}px`,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  zIndex: 0,
                                  pointerEvents: "none",
                                }}
                              />
                            )}

                            {/* Import bar (extends upward from zero) or Export bar (extends downward) */}
                            <div
                              style={{
                                width: "90%",
                                height: gridHeight,
                                backgroundColor: "#3E5C76",
                                opacity: renderAsPast
                                  ? 1
                                  : variant === "solid"
                                    ? 0.4
                                    : gridBarOpacity,
                                backgroundImage:
                                  !renderAsPast &&
                                  variant === "hatched"
                                    ? `repeating-linear-gradient(
                                        45deg,
                                        transparent,
                                        transparent ${hatchDensity}px,
                                        rgba(255,255,255,0.3) ${hatchDensity}px,
                                        rgba(255,255,255,0.3) ${hatchDensity + 1}px
                                      )`
                                    : "none",
                                borderRadius: isImport ? "4px 4px 0 0" : "0 0 4px 4px",
                                position: "absolute",
                                [isImport ? "bottom" : "top"]: `${isImport ? barContainerHeight - gridZeroY : gridZeroY}px`,
                                left: "50%",
                                transform: "translateX(-50%)",
                                zIndex: 1,
                              }}
                            />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}

              {/* Battery tab: SVG area chart overlay */}
              {activeTab === "battery" && (() => {
                // Calculate points for the area chart - map SOC (0-100) to plot area
                if (!selectedDay || !selectedDay.hours) return null;

                const points = selectedDay.hours.map((hourData, h) => {
                  const x = h * (columnWidth + COLUMN_GAP) + columnWidth / 2;
                  const y = barContainerHeight - (hourData.soc / 100) * barContainerHeight;
                  return { x, y, soc: hourData.soc, hour: h };
                });

                // Create linear path (straight line segments between points)
                const createLinearPath = (points: Array<{ x: number; y: number }>) => {
                  if (points.length === 0) return "";
                  let path = `M ${points[0].x},${points[0].y}`;
                  for (let i = 1; i < points.length; i++) {
                    path += ` L ${points[i].x},${points[i].y}`;
                  }
                  return path;
                };

                // Split path at NOW marker or handle future days
                let pastPoints: Array<{ x: number; y: number; soc: number; hour: number }> = [];
                let forecastPoints: Array<{ x: number; y: number; soc: number; hour: number }> = [];

                // Calculate days ahead for continuous opacity
                const todayDate = new Date(todayISO);
                const selectedDate = new Date(selectedDay.date);
                const daysAhead = Math.floor((selectedDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

                if (daysAhead === 0) {
                  // Today: split at the current hour
                  const nowIndex = currentHour;
                  pastPoints = nowIndex >= 0 ? points.slice(0, nowIndex + 1) : [];
                  forecastPoints = nowIndex >= 0 && nowIndex < points.length - 1 ? points.slice(nowIndex) : [];
                } else if (daysAhead < 0) {
                  // Past day: every hour is historical — render all as solid past
                  pastPoints = points;
                  forecastPoints = [];
                } else {
                  // Future day: nothing has happened yet — render all as forecast/dashed
                  pastPoints = [];
                  forecastPoints = points;
                }

                const pastPath = pastPoints.length > 0 ? createLinearPath(pastPoints) : "";
                const forecastPath = forecastPoints.length > 0 ? createLinearPath(forecastPoints) : "";

                // Create area fill paths (close to baseline)
                const pastAreaPath = pastPath && pastPoints.length > 0 ? pastPath + ` L ${pastPoints[pastPoints.length - 1].x},${barContainerHeight} L ${pastPoints[0].x},${barContainerHeight} Z` : "";
                const forecastAreaPath = forecastPath && forecastPoints.length > 0 ? forecastPath + ` L ${forecastPoints[forecastPoints.length - 1].x},${barContainerHeight} L ${forecastPoints[0].x},${barContainerHeight} Z` : "";

                // Calculate opacity based on days ahead (continuous gradient)
                let forecastOpacity = 0.3;
                if (variant === "hatched") {
                  if (daysAhead === 0 || daysAhead === 1) {
                    forecastOpacity = 0.6; // Today/tomorrow: 60%
                  } else if (daysAhead === 2) {
                    forecastOpacity = 0.45; // Wednesday: 45%
                  } else if (daysAhead >= 3) {
                    forecastOpacity = 0.35; // Thursday-Sunday: 35%
                  }
                }

                // Create confidence band for forecast (DR9) - upper and lower boundaries
                // Use forecast points for confidence bands
                const confidencePoints = forecastPoints;
                const maxHoursAhead = confidencePoints.length > 1 ? confidencePoints.length - 1 : 1;

                // Confidence band width increases with days ahead
                let baseBandPercent = 5; // ±5% to ±10% for today/tomorrow
                if (daysAhead === 2) baseBandPercent = 7; // ±7% to ±12% for Wednesday
                if (daysAhead >= 3) baseBandPercent = 10; // ±10% to ±15% for Thursday+

                const upperBoundaryPoints = confidencePoints.map((point, i) => {
                  const bandExtentPercent = variant === "hatched" && confidencePoints.length > 0
                    ? baseBandPercent + (i / maxHoursAhead) * baseBandPercent  // Progressive widening
                    : 0;
                  const upperSoc = Math.min(100, point.soc + bandExtentPercent);
                  const y = barContainerHeight - (upperSoc / 100) * barContainerHeight;
                  return { x: point.x, y };
                });

                const lowerBoundaryPoints = confidencePoints.map((point, i) => {
                  const bandExtentPercent = variant === "hatched" && confidencePoints.length > 0
                    ? baseBandPercent + (i / maxHoursAhead) * baseBandPercent  // Progressive widening
                    : 0;
                  const lowerSoc = Math.max(0, point.soc - bandExtentPercent);
                  const y = barContainerHeight - (lowerSoc / 100) * barContainerHeight;
                  return { x: point.x, y };
                });

                const upperBoundaryPath = upperBoundaryPoints.length > 0 ? createLinearPath(upperBoundaryPoints) : "";
                const lowerBoundaryPath = lowerBoundaryPoints.length > 0 ? createLinearPath(lowerBoundaryPoints) : "";

                // Create filled area between upper and lower boundaries
                const confidenceBandPath = upperBoundaryPath && lowerBoundaryPath && lowerBoundaryPoints.length > 0
                  ? upperBoundaryPath + ` L ${lowerBoundaryPoints[lowerBoundaryPoints.length - 1].x},${lowerBoundaryPoints[lowerBoundaryPoints.length - 1].y}` + lowerBoundaryPoints.slice().reverse().map((p, i) => i === 0 ? "" : ` L ${p.x},${p.y}`).join("") + " Z"
                  : "";

                return (
                  <svg
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: barContainerHeight,
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  >
                    {/* Past area fill */}
                    {pastPath && pastAreaPath && (
                      <>
                        <path
                          d={pastAreaPath}
                          fill="#2596BE"
                          fillOpacity={0.8}
                        />
                        <path
                          d={pastPath}
                          fill="none"
                          stroke="#2596BE"
                          strokeWidth={2}
                          strokeLinejoin="round"
                        />
                      </>
                    )}

                    {/* Confidence band for forecast (DR9) */}
                    {variant === "hatched" && confidenceBandPath && (
                      <>
                        {/* Filled area between boundaries */}
                        <path
                          d={confidenceBandPath}
                          fill="#2596BE"
                          fillOpacity={0.05}
                        />
                        {/* Upper boundary line */}
                        <path
                          d={upperBoundaryPath}
                          fill="none"
                          stroke="#2596BE"
                          strokeWidth={1}
                          strokeOpacity={0.06}
                          strokeLinejoin="round"
                        />
                        {/* Lower boundary line */}
                        <path
                          d={lowerBoundaryPath}
                          fill="none"
                          stroke="#2596BE"
                          strokeWidth={1}
                          strokeOpacity={0.06}
                          strokeLinejoin="round"
                        />
                      </>
                    )}

                    {/* Forecast area fill */}
                    {forecastPath && forecastAreaPath && (
                      <>
                        <path
                          d={forecastAreaPath}
                          fill="#2596BE"
                          fillOpacity={forecastOpacity * 0.5}
                        />
                        <path
                          d={forecastPath}
                          fill="none"
                          stroke="#2596BE"
                          strokeWidth={1}
                          strokeOpacity={forecastOpacity}
                          strokeDasharray="4,4"
                          strokeLinejoin="round"
                        />
                      </>
                    )}
                  </svg>
                );
              })()}

              {/* Tooltip */}
              {tooltipHour !== null && (() => {
                const tooltipData = selectedDay.hours[tooltipHour];
                const tooltipLeftPx = tooltipHour * (columnWidth + COLUMN_GAP) + (columnWidth / 2);
                
                // Determine horizontal alignment based on column position
                const isLeftEdge = tooltipHour < 4; // Leftmost 4 columns (00:00-03:00)
                const isRightEdge = tooltipHour >= 20; // Rightmost 4 columns (20:00-23:00)
                
                // Calculate change vs previous hour for Battery tab
                const prevSoc = tooltipHour > 0 ? selectedDay.hours[tooltipHour - 1].soc : tooltipData.soc;
                const socChange = tooltipData.soc - prevSoc;
                
                // Grid flow: use scenario-derived data for today, mock for other days
                const gridValue = isTodaySelected && hourlyGridFlow
                  ? hourlyGridFlow[tooltipHour]
                  : tooltipData.consumption - tooltipData.solar;
                const isImport = gridValue >= 0;
                
                // Calculate hourly cost
                const hourlyCost = tooltipData.consumption * tooltipData.priceKwh;
                
                // Calculate bar heights for positioning
                let barTopHeight = 0; // Distance from bottom of container to top of bar
                let positionBelow = false; // Whether to flip tooltip below bar
                
                if (activeTab === "energy") {
                  const solarHeight = (tooltipData.solar / maxEnergy) * barContainerHeight;
                  const consumptionHeight = (tooltipData.consumption / maxEnergy) * barContainerHeight;
                  barTopHeight = Math.max(solarHeight, consumptionHeight);
                } else if (activeTab === "battery") {
                  barTopHeight = (tooltipData.soc / 100) * barContainerHeight;
                } else if (activeTab === "grid") {
                  // Asymmetric axis: import zone = gridZeroY (160 px), export zone = 80 px
                  const tooltipGridHeight = isImport
                    ? (Math.min(gridValue, GRID_MAX_IMPORT) / GRID_MAX_IMPORT) * gridZeroY
                    : (Math.min(Math.abs(gridValue), GRID_MAX_EXPORT) / GRID_MAX_EXPORT) * (barContainerHeight - gridZeroY);
                  if (isImport) {
                    // Import bar extends upward from zero line — tooltip above
                    barTopHeight = (barContainerHeight - gridZeroY) + tooltipGridHeight;
                    positionBelow = false;
                  } else {
                    // Export bar extends downward from zero line — tooltip below
                    barTopHeight = barContainerHeight - gridZeroY;
                    positionBelow = true;
                  }
                }
                
                // Calculate vertical position
                const tooltipGap = 8; // Gap between tooltip and bar
                const tooltipBottom = barTopHeight + tooltipGap;
                
                // Check if tooltip would clip top edge (if bottom position > container height - estimated tooltip height)
                const estimatedTooltipHeight = 120; // Approximate tooltip height
                if (!positionBelow && tooltipBottom + estimatedTooltipHeight > barContainerHeight) {
                  positionBelow = true;
                }
                
                return (
                  <div
                    data-tooltip="true"
                    style={{
                      position: "absolute",
                      left: isLeftEdge ? tooltipLeftPx - (columnWidth / 2) : (isRightEdge ? "auto" : tooltipLeftPx),
                      right: isRightEdge ? `calc(100% - ${tooltipLeftPx + (columnWidth / 2)}px)` : "auto",
                      bottom: positionBelow ? "auto" : tooltipBottom,
                      top: positionBelow ? barContainerHeight - barTopHeight + tooltipGap : "auto",
                      transform: isLeftEdge ? "none" : (isRightEdge ? "none" : "translateX(-50%)"),
                      zIndex: 20,
                      pointerEvents: "none",
                    }}
                  >
                    {/* Tooltip box */}
                    <div
                      style={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E5E7EB",
                        borderRadius: 8,
                        padding: 12,
                        maxWidth: 220,
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                      }}
                    >
                      {/* Hour heading */}
                      <div
                        style={{
                          fontFamily: fonts.family.sans,
                          fontSize: 11,
                          fontWeight: fonts.weight.semibold,
                          color: "#6B7280",
                          textTransform: "uppercase",
                          marginBottom: 8,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {tooltipHour.toString().padStart(2, "0")}:00 – {((tooltipHour + 1) % 24).toString().padStart(2, "0")}:00
                      </div>
                      
                      {/* Confidence indicator - only for variant="hatched" (C/D) */}
                      {variant === "hatched" && (() => {
                        const hoursFromNow = tooltipHour - currentHour;
                        let dotOpacity = 1;
                        let confidenceLabel = "Confirmed";

                        if (!tooltipData.isRetrospective) {
                          // Forecast data
                          if (isFutureDay) {
                            // On future days: first half = high confidence, second half = moderate
                            if (tooltipHour < 12) {
                              dotOpacity = 0.6;
                              confidenceLabel = "High confidence";
                            } else {
                              dotOpacity = 0.35;
                              confidenceLabel = "Moderate";
                            }
                          } else {
                            // On today: 1-4 hours = high, 5+ hours = moderate
                            if (hoursFromNow >= 1 && hoursFromNow <= 4) {
                              dotOpacity = 0.6;
                              confidenceLabel = "High confidence";
                            } else if (hoursFromNow >= 5) {
                              dotOpacity = 0.35;
                              confidenceLabel = "Moderate";
                            }
                          }
                        }

                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 6,
                            }}
                          >
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: "#1F2937",
                                opacity: dotOpacity,
                              }}
                            />
                            <span
                              style={{
                                fontFamily: fonts.family.sans,
                                fontSize: 11,
                                fontWeight: fonts.weight.medium,
                                color: "#6B7280",
                              }}
                            >
                              {confidenceLabel}
                            </span>
                          </div>
                        );
                      })()}
                      
                      {/* Content based on active tab */}
                      <div
                        style={{
                          fontFamily: fonts.family.sans,
                          fontSize: 13,
                          color: "#1C1C1E",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {activeTab === "energy" && (
                          <>
                            <div>Solar generation: {tooltipData.solar.toFixed(1)} kWh</div>
                            <div>Consumption: {tooltipData.consumption.toFixed(1)} kWh</div>
                            {showCausalContext && (
                              <div style={{ borderTop: "1px solid #E5E7EB", marginTop: 6, paddingTop: 6 }}>
                                <div style={{ fontSize: 12, fontStyle: "italic", color: "#6B7280" }}>
                                  {(() => {
                                    const isInChargeWindow = tooltipHour >= chargeStartHour && tooltipHour < chargeEndHour;
                                    const isPast = tooltipData.isRetrospective;

                                    if (isInChargeWindow) {
                                      return isPast ? "Charged from solar" : "Scheduled charging";
                                    }
                                    if (tooltipData.solar === 0) {
                                      return isPast ? "Grid only" : "Grid only expected";
                                    }
                                    if (tooltipData.solar > tooltipData.consumption) {
                                      return isPast ? "Exported to grid" : "Expected surplus";
                                    }
                                    return isPast ? "Drew from grid" : "Expected grid draw";
                                  })()}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {activeTab === "battery" && (
                          <>
                            <div>State of charge: {Math.round(tooltipData.soc)}%</div>
                            <div>
                              Change: {socChange >= 0 ? "+" : ""}{Math.round(socChange)}%
                            </div>
                            {showCausalContext && (
                              <div style={{ borderTop: "1px solid #E5E7EB", marginTop: 6, paddingTop: 6 }}>
                                <div style={{ fontSize: 12, fontStyle: "italic", color: "#6B7280" }}>
                                  {(() => {
                                    const isPast = tooltipData.isRetrospective;

                                    if (socChange > 0) {
                                      return isPast ? "Charged from solar" : "Charging expected";
                                    }
                                    if (socChange < 0) {
                                      return isPast ? "Discharged to home" : "Discharge expected";
                                    }
                                    return isPast ? "Held charge" : "Holding expected";
                                  })()}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {activeTab === "grid" && (
                          <>
                            <div>
                              Grid flow: {isImport ? "+" : "−"}{Math.abs(gridValue).toFixed(1)} kWh {isImport ? "imported" : "exported"}
                            </div>
                            {showCausalContext && (
                              <div style={{ borderTop: "1px solid #E5E7EB", marginTop: 6, paddingTop: 6 }}>
                                <div style={{ fontSize: 12, fontStyle: "italic", color: "#6B7280" }}>
                                  {(() => {
                                    const isPast = tooltipData.isRetrospective;

                                    if (isImport) {
                                      return isPast ? "Imported from grid" : "Import expected";
                                    }
                                    return isPast ? "Exported to grid" : "Export expected";
                                  })()}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Arrow pointing to bar */}
                    <div
                      style={{
                        position: "absolute",
                        [positionBelow ? "bottom" : "top"]: "100%",
                        left: isLeftEdge ? (columnWidth / 2) : (isRightEdge ? "auto" : "50%"),
                        right: isRightEdge ? (columnWidth / 2) : "auto",
                        transform: (isLeftEdge || isRightEdge) ? "translateX(-50%)" : "translateX(-50%)",
                        width: 0,
                        height: 0,
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        [positionBelow ? "borderBottom" : "borderTop"]: "6px solid #FFFFFF",
                        filter: "drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05))",
                      }}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Row 5: Tariff pill row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
                gap: COLUMN_GAP,
                width: "100%",
                minWidth: 0,
                marginTop: 0,
                height: 32,
              }}
            >
              {selectedDay.hours.map((hourData, h) => {
                const { priceTier, priceKwh } = hourData;
                const pillColor =
                  priceTier === "low" ? "#5BB85B" :
                  priceTier === "mid" ? "#E8971A" : "#E8735F";
                
                return (
                  <div
                    key={`tariff-pill-${h}`}
                    style={{
                      minWidth: 0,
                      overflow: "visible",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: pillColor,
                        color: "#fff",
                        fontFamily: fonts.family.sans,
                        fontSize: 7,
                        fontWeight: fonts.weight.bold,
                        height: 20,
                        padding: "0 7px",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      £{priceKwh.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 6: Carbon intensity pill row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
                gap: COLUMN_GAP,
                width: "100%",
                minWidth: 0,
                marginTop: 8,
                height: 32,
                position: "relative",
              }}
            >
              {/* CO₂ label positioned to align with y-axis */}
              <div
                style={{
                  position: "absolute",
                  left: -36,
                  top: 0,
                  bottom: 0,
                  width: 28,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.family.sans,
                    fontSize: 9,
                    color: "#9CA3AF",
                    fontWeight: fonts.weight.regular,
                    textAlign: "right",
                  }}
                >
                  CO₂
                </span>
              </div>

              {/* Carbon pills */}
              {selectedDay.hours.map((hourData, h) => {
                // Illustrative mock carbon values (used for non-today days)
                const mockCarbonValues = [210, 220, 230, 240, 250, 260, 240, 220, 200, 190, 180, 170, 160, 155, 150, 160, 170, 180, 200, 220, 240, 250, 260, 250];
                // Use scenario hourlyCarbon for today; fall back to illustrative mock for all other days
                const carbonValue = (isTodaySelected && hourlyCarbon)
                  ? (hourlyCarbon[h] ?? mockCarbonValues[h])
                  : mockCarbonValues[h];

                // Determine color based on carbon intensity
                let pillBg: string;
                let pillText: string;
                if (carbonValue > 280) {
                  pillBg = "#374151";
                  pillText = "#FFFFFF";
                } else if (carbonValue >= 200) {
                  pillBg = "#9CA3AF";
                  pillText = "#FFFFFF";
                } else {
                  pillBg = "#D1D5DB";
                  pillText = "#374151";
                }

                // Determine opacity based on past/forecast
                const isRetrospective = hourData.isRetrospective;
                const pillOpacity = isRetrospective ? 1 : 0.4;

                return (
                  <div
                    key={`carbon-pill-${h}`}
                    style={{
                      minWidth: 0,
                      overflow: "visible",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: pillBg,
                        color: pillText,
                        fontFamily: fonts.family.sans,
                        fontSize: 7,
                        fontWeight: fonts.weight.bold,
                        height: 20,
                        padding: "0 7px",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "nowrap",
                        opacity: pillOpacity,
                      }}
                    >
                      {carbonValue}g
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            marginTop: space[3],
            paddingTop: space[3],
            borderTop: `1px solid ${colors.border.subtle}`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: space[4],
              fontSize: fonts.size.xs,
              fontFamily: fonts.family.sans,
            }}
          >
            {/* Data series legend - left group (tab-aware) */}
            {activeTab === "energy" && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: space[2],
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 12,
                      backgroundColor: "#E8971A",
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color: colors.text.secondary }}>
                    Solar generation
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: space[2],
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 12,
                      backgroundColor: "#9B8EC4",
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color: colors.text.secondary }}>
                    Consumption
                  </span>
                </div>
              </>
            )}

            {activeTab === "battery" && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: space[2],
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 12,
                      backgroundColor: "#5B9BD5",
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color: colors.text.secondary }}>
                    Battery state of charge
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: space[2],
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 12,
                      backgroundColor: "#D9EAF7",
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color: colors.text.secondary }}>
                    Battery forecast
                  </span>
                </div>
              </>
            )}

            {activeTab === "grid" && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: space[2],
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 12,
                      backgroundColor: "#3E5C76",
                      borderRadius: 2,
                    }}
                  />
                  <span style={{ color: colors.text.secondary }}>
                    Grid flow
                  </span>
                </div>
              </>
            )}

            {/* Fill treatment legend (varies by variant) - right group (consistent across tabs) */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                gap: space[3],
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: space[1],
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 12,
                    backgroundColor: "#8E8E93",
                    borderRadius: 2,
                  }}
                />
                <span style={{ color: colors.text.secondary }}>
                  Past data
                </span>
              </div>
              {variant === "solid" ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: space[1],
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 12,
                      backgroundColor: "#8E8E93",
                      opacity: 0.4,
                      borderRadius: 2,
                    }}
                  />
                  <span
                    style={{ color: colors.text.secondary }}
                  >
                    Forecast
                  </span>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: space[1],
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 12,
                        backgroundColor: "#8E8E93",
                        opacity: 1,
                        borderRadius: 2,
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 5px)`,
                      }}
                    />
                    <span
                      style={{ color: colors.text.secondary }}
                    >
                      Near-term forecast
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: space[1],
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 12,
                        backgroundColor: "#8E8E93",
                        opacity: 0.6,
                        borderRadius: 2,
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.3) 6px, rgba(255,255,255,0.3) 7px)`,
                      }}
                    />
                    <span
                      style={{ color: colors.text.secondary }}
                    >
                      Long-term forecast
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Confidence indicator legend - only for variant="hatched" (C/D) */}
          {variant === "hatched" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: space[3],
                paddingTop: space[2],
                borderTop: `1px solid ${colors.border.subtle}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#1F2937",
                    opacity: 1,
                  }}
                />
                <span style={{ fontFamily: fonts.family.sans, fontSize: 11, color: "#6B7280" }}>
                  Confirmed
                </span>
              </div>
              <span style={{ color: "#D1D5DB" }}>·</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#1F2937",
                    opacity: 0.6,
                  }}
                />
                <span style={{ fontFamily: fonts.family.sans, fontSize: 11, color: "#6B7280" }}>
                  High confidence
                </span>
              </div>
              <span style={{ color: "#D1D5DB" }}>·</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#1F2937",
                    opacity: 0.35,
                  }}
                />
                <span style={{ fontFamily: fonts.family.sans, fontSize: 11, color: "#6B7280" }}>
                  Moderate
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}