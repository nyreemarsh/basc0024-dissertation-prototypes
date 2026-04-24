import { useState } from "react";
import { Shell } from "./components/shared/Shell";
import { Header } from "./components/shared/Header";
import { SummaryCard } from "./components/shared/SummaryCard";
import { TemporalNav } from "./components/shared/TemporalNav";
import { colors, fonts } from "./tokens";
import { useScenario } from "../context/ScenarioContext";
import type { CausalFactors, FactorWeight, Scenario, TariffBand } from "../scenarios/types";
import { computeHourlyGridFlow } from "../scenarios/derivations";

/**
 * Prototype D — Truly Explainable (DR10)
 *
 * Inherits: All of Prototype A + B + C
 * Adds: Contrastive reasoning drawer with:
 *   - Two-column decision comparison (actual vs. counterfactual)
 *     Derived from scenario.counterfactual
 *   - Mini comparison chart (both SOC trajectories)
 *     Chart SVG paths are hardcoded illustrative shapes — see note below.
 *   - Three what-if scenario chips ("Solar 50% lower", "Peak rate", "Battery full")
 *     These are kept hardcoded (Option A) — they demonstrate DR10 counterfactual
 *     reasoning capability without requiring per-scenario what-if data structures.
 *
 * DR10: Prototype D must support contrastive and counterfactual reasoning,
 *       not merely describe the current state.
 *
 * Miller (2019): People do not ask "why P happened" — they ask "why P rather
 * than Q." This prototype operationalises contrastive explanation.
 *
 * Note on chart paths: The mini trajectory charts use hardcoded SVG path data.
 * No hourly SOC trajectory data exists in the Scenario interface, so paths
 * cannot be computed dynamically. The chart is an illustrative diagram;
 * only the legend labels derive from scenario data.
 *
 * Forecast encoding: diagonal hatched fill with confidence-based opacity/density (variant="hatched")
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parses the hour component from a 'HH:MM' string. */
function toHour(hhmm: string): number {
  return parseInt(hhmm.split(':')[0], 10);
}

/** Formats a pence integer as a £-prefixed display string. e.g. 147 → '£1.47'. */
function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/**
 * Returns the TariffBand covering the given 'HH:MM' time string,
 * with minute-level precision for half-hour boundaries (e.g. '18:30').
 */
function findTariffBand(schedule: TariffBand[], hhmm: string): TariffBand | undefined {
  const [h, m] = hhmm.split(':').map(Number);
  const totalMin = h * 60 + m;
  return schedule.find(band => {
    const [fh, fm] = band.from.split(':').map(Number);
    const fromMin = fh * 60 + fm;
    const [th, tm] = band.to === '00:00' ? [24, 0] : band.to.split(':').map(Number);
    const toMin = th * 60 + tm;
    return totalMin >= fromMin && totalMin < toMin;
  });
}

/** Maps a TariffBand label to a human-readable display string. */
const TARIFF_DISPLAY: Record<string, string> = {
  'overnight-low': 'Overnight low',
  'daytime':       'Daytime',
  'peak':          'Peak',
  'post-peak':     'Post-peak',
  'post-spike':    'Post-spike',
  'spike':         'Spike',
};

/**
 * Maps a factor weight to its confidence qualifier label and dot opacity.
 * Opacity encodes certainty: 1.0 = fully confident, lower = more uncertain.
 */
function weightToConfidence(weight: Exclude<FactorWeight, 'none'>): {
  label: string;
  opacity: number;
} {
  switch (weight) {
    case 'primary':
    case 'high':     return { label: 'High confidence', opacity: 1.0 };
    case 'moderate': return { label: 'Moderate',        opacity: 0.6 };
    case 'low':      return { label: 'Low confidence',  opacity: 0.3 };
  }
}

/**
 * Returns the badge text for the alternative card's cost delta.
 *   positive delta → alternative costs MORE than AI's choice → warn user
 *   negative delta → alternative costs less (AI prioritised something else)
 *   zero           → same cost
 *
 * Note: 'SIMILAR COST' is used for negative deltas. The only negative case
 * in the current scenarios is S2 (−8p), where the counterfactual note
 * explicitly frames this as "virtually same cost". If a scenario with a
 * larger negative delta is added, this badge text should be revisited.
 */
function formatDeltaBadge(costDeltaPence: number): string {
  if (costDeltaPence > 0)  return `+${formatPounds(costDeltaPence)} MORE`;
  if (costDeltaPence < 0)  return 'SIMILAR COST';
  return 'SAME COST';
}

function deltaBadgeColor(costDeltaPence: number): string {
  return costDeltaPence > 0 ? '#E8735F' : '#9CA3AF';
}

// ── Causal factor rendering (inherits from C) ─────────────────────────────────

const WEIGHT_ORDER: FactorWeight[] = ['primary', 'high', 'moderate', 'low'];
const FACTOR_KEYS: (keyof CausalFactors)[] = [
  'solar', 'gridPricing', 'carbonIntensity', 'batteryHeadroom', 'userPreference',
];

interface FactorItem {
  color: string;
  boldText: string;
  confidenceLabel: string;
  confidenceOpacity: number;
  consequenceText: string;
}

function buildFactorItems(scenario: Scenario): FactorItem[] {
  const {
    causalFactors, solarForecast, tariffSchedule, savingsBreakdown,
    batterySOCPct, chargeWindowStart, carbonIntensity, userOverride,
  } = scenario;

  const chargeBand = findTariffBand(tariffSchedule, chargeWindowStart);
  const chargeBandRate = chargeBand?.ratePence ?? 0;
  const chargeBandUntil = chargeBand?.to ?? '00:00';

  type FactorConfig = Omit<FactorItem, 'confidenceLabel' | 'confidenceOpacity'>;

  const factorConfig: Record<keyof CausalFactors, FactorConfig> = {
    solar: {
      color: "#E8971A",
      boldText:
        solarForecast.peakWindowStart && solarForecast.peakWindowEnd
          ? `Solar generation is forecast to peak ${solarForecast.peakWindowStart}–${solarForecast.peakWindowEnd}`
          : "Solar generation forecast",
      consequenceText: "maximising free energy capture",
    },
    gridPricing: {
      color: "#2FA75A",
      boldText: `Grid tariff is expected to remain at ${formatPounds(chargeBandRate)}/kWh until ${chargeBandUntil}`,
      consequenceText: `charging before the price rise saves ${formatPounds(savingsBreakdown.offPeakPence)}`,
    },
    carbonIntensity: {
      color: colors.brand.carbonIntensity,
      boldText:
        carbonIntensity.length > 0
          ? `Grid carbon intensity is ${carbonIntensity[0].gCO2perKWh} gCO₂/kWh at ${carbonIntensity[0].time}`
          : "Grid carbon intensity is elevated",
      consequenceText: "charging later uses cleaner grid energy",
    },
    batteryHeadroom: {
      color: "#2596BE",
      boldText: `Battery was at ${batterySOCPct}%, below recommended level`,
      consequenceText: "prioritising charge to maintain household supply",
    },
    userPreference: {
      color: "#9CA3AF",
      boldText: userOverride
        ? `${userOverride.originalScheduleDescription} scheduled for ${userOverride.originalWindowStart}–${userOverride.originalWindowEnd}`
        : "Your scheduled preferences",
      consequenceText: "rescheduled to avoid unexpected price surge",
    },
  };

  return FACTOR_KEYS
    .filter(key => causalFactors[key] !== 'none')
    .sort((a, b) =>
      WEIGHT_ORDER.indexOf(causalFactors[a]) - WEIGHT_ORDER.indexOf(causalFactors[b])
    )
    .map(key => {
      const weight = causalFactors[key] as Exclude<FactorWeight, 'none'>;
      const { label, opacity } = weightToConfidence(weight);
      return { ...factorConfig[key], confidenceLabel: label, confidenceOpacity: opacity };
    });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PrototypeD() {
  const scenario = useScenario();
  const hourlyGridFlow = computeHourlyGridFlow(scenario);
  const {
    chargeWindowStart, chargeWindowEnd,
    costTodayPence, savingsPence, savingsBreakdown, co2AvoidedKg,
    forecastAccuracyPct, forecastVariancePct,
    counterfactual, tariffSchedule,
  } = scenario;

  const [isModalOpen, setIsModalOpen] = useState(false);
  // Renamed from 'activeScenario' to avoid shadowing the study scenario from context
  const [activeWhatIf, setActiveWhatIf] = useState<"lowerSolar" | "peakRate" | "fullBattery" | null>(null);

  // Time-aware charging state (mirrors PrototypeA/B/C)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  const chargeStart = toHour(chargeWindowStart);
  const chargeEnd = toHour(chargeWindowEnd);

  const todayISO = now.toISOString().split("T")[0];

  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    date: string;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
  }>({
    date: todayISO,
    isToday: true,
    isPast: false,
    isFuture: false,
  });

  const isBeforeCharge = currentHour < chargeStart;
  const isDuringCharge = currentHour >= chargeStart && currentHour < chargeEnd;
  const isAfterCharge = currentHour >= chargeEnd;

  let batterySOC = scenario.batterySOCPct;
  if (isDuringCharge) {
    const minutesSinceChargeStart = (currentHour - chargeStart) * 60 + currentMinutes;
    const totalChargeMinutes = (chargeEnd - chargeStart) * 60;
    batterySOC = Math.round(
      scenario.batterySOCPct +
        ((100 - scenario.batterySOCPct) * minutesSinceChargeStart) / totalChargeMinutes
    );
  } else if (isAfterCharge) {
    batterySOC = 100;
  }

  let chargingState: "charging-solar" | "charging-grid" | "discharging" | "idle" = "idle";
  if (isDuringCharge) {
    chargingState = "charging-grid";
  }

  // Notification text — time-aware
  let notificationText = "";
  if (selectedDayInfo.isToday && isBeforeCharge) {
    notificationText = `Your battery is scheduled to charge today at ${chargeWindowStart}. Charging will complete by ${chargeWindowEnd}.`;
  } else if (selectedDayInfo.isToday && isDuringCharge) {
    notificationText = `Your battery is charging now. Started at ${chargeWindowStart}, scheduled to complete by ${chargeWindowEnd}.`;
  } else if (selectedDayInfo.isToday && isAfterCharge) {
    notificationText = `Your battery finished charging today at ${chargeWindowEnd}. Battery is now at 100%.`;
  } else if (selectedDayInfo.isPast) {
    notificationText = `Battery charged at ${chargeWindowStart}. Charging completed at ${chargeWindowEnd}.`;
  } else if (selectedDayInfo.isFuture) {
    notificationText = `Battery is scheduled to charge at ${chargeWindowStart}. Charging will complete by ${chargeWindowEnd}.`;
  }

  // Cost text — today includes savings breakdown + counterfactual delta (D's addition)
  const savingsPart = `Estimated savings: ${formatPounds(savingsPence)} (${formatPounds(savingsBreakdown.solarPence)} solar · ${formatPounds(savingsBreakdown.offPeakPence)} off-peak)`;
  const deltaNote = counterfactual.costDeltaPence > 0
    ? ` — ${formatPounds(counterfactual.costDeltaPence)} saved vs next best option`
    : counterfactual.costDeltaPence < 0
    ? ` — ${formatPounds(Math.abs(counterfactual.costDeltaPence))} more than lowest-cost option`
    : '';

  let costText = "";
  if (selectedDayInfo.isToday) {
    costText = [
      `Estimated cost today: ${formatPounds(costTodayPence)}`,
      savingsPart + deltaNote,
      `CO₂ avoided: ${co2AvoidedKg} kg`,
    ].join(' · ');
  } else if (selectedDayInfo.isPast) {
    const dayOfWeek = new Date(selectedDayInfo.date).getDay();
    const pastCosts = [
      { cost: "£2.80", savings: "£0.90", co2: "1.8 kg" }, // Sunday
      { cost: "£3.10", savings: "£1.05", co2: "2.0 kg" }, // Monday
      { cost: "£2.95", savings: "£1.15", co2: "2.2 kg" }, // Tuesday
      { cost: "£3.25", savings: "£1.30", co2: "2.5 kg" }, // Wednesday
      { cost: "£3.50", savings: "£1.40", co2: "2.7 kg" }, // Thursday
      { cost: "£2.85", savings: "£0.95", co2: "1.9 kg" }, // Friday
      { cost: "£3.00", savings: "£1.00", co2: "2.0 kg" }, // Saturday
    ];
    const { cost, savings, co2 } = pastCosts[dayOfWeek];
    costText = `Total cost: ${cost} · Savings: ${savings} · CO₂ avoided: ${co2}`;
  } else if (selectedDayInfo.isFuture) {
    costText = "Forecast cost: £3.15 · Forecast savings: £1.10 · Forecast CO₂ avoided: 2.3 kg";
  }

  // Forecast accuracy — omits ±X% when forecastVariancePct is absent (S3)
  const forecastAccuracy = forecastVariancePct !== undefined
    ? `Forecast accuracy: ${forecastAccuracyPct}% — yesterday's forecast was within ±${forecastVariancePct}% of actual`
    : `Forecast accuracy: ${forecastAccuracyPct}%`;

  const showModifyButton = selectedDayInfo.isToday && !isAfterCharge;

  // ── What-if chip content (hardcoded, Option A) ──────────────────────────────
  // These chips are illustrative examples of DR10 counterfactual reasoning.
  // They do not map to scenario-specific data and remain the same across all
  // three study scenarios.

  const getWhatIfContent = () => {
    if (activeWhatIf === "lowerSolar") {
      return {
        title: "What if solar was 50% lower?",
        chartTitle: "Battery level comparison",
        yAxisLabel: "%",
        summary: (
          <>
            With 50% less solar, charging at 16:00 instead of 19:00 saves{" "}
            <span style={{ fontWeight: fonts.weight.semibold }}>£0.32</span> and avoids{" "}
            <span style={{ fontWeight: fonts.weight.semibold }}>0.8 kg</span> of additional CO₂.
          </>
        ),
        actualCard: {
          time: "Charge at 16:00",
          rate: "Off-peak (£0.10/kWh)",
          cost: "~£0.38",
        },
        alternativeCard: {
          badge: "+£0.32 MORE",
          badgeColor: "#E8735F",
          time: "Charge at 19:00",
          rate: "Peak (£0.35/kWh)",
          cost: "~£0.70",
        },
        chartPaths: {
          actual: "M 0,196 L 40,196 L 80,196 L 120,196 L 160,196 L 200,196 L 240,56 L 280,56 L 320,71 L 360,90 L 400,103",
          actualFill: "M 0,196 L 40,196 L 80,196 L 120,196 L 160,196 L 200,196 L 240,56 L 280,56 L 320,71 L 360,90 L 400,103 L 400,280 L 0,280 Z",
          alternative: "M 0,196 L 40,196 L 80,196 L 120,196 L 160,196 L 200,196 L 240,196 L 280,69 L 320,69 L 360,97 L 400,112",
        },
        actualLegend: "Actual (16:00)",
        alternativeLegend: "If charged at 19:00",
        xAxisLabels: ["14:00", "16:00", "19:00", "21:00", "23:00"],
        yAxisLabels: ["100%", "67%", "33%", "0%"],
      };
    } else if (activeWhatIf === "peakRate") {
      return {
        title: "What if you charged at peak rate?",
        chartTitle: "Cost comparison",
        yAxisLabel: "£",
        summary: null,
        causalText: "AI shifted charging to off-peak hours (01:00–05:00 at 7p/kWh), avoiding 34p/kWh peak.",
        metricCards: [
          { label: "Saved today", value: "£1.40" },
          { label: "Peak rate", value: "£2.85 vs actual: £1.45" },
        ],
        chartPaths: {
          actual: "M 0,50 L 50,180 L 100,240 L 150,260 L 200,270 L 250,270 L 300,270 L 350,270 L 400,270",
          actualFill: "M 0,50 L 50,180 L 100,240 L 150,260 L 200,270 L 250,270 L 300,270 L 350,270 L 400,270 L 400,280 L 0,280 Z",
          alternative: "M 0,270 L 50,270 L 100,270 L 150,270 L 200,270 L 250,140 L 300,60 L 350,40 L 400,30",
        },
        actualLegend: "AI-scheduled cost",
        alternativeLegend: "Peak rate cost",
        xAxisLabels: ["00:00", "03:00", "06:00", "12:00", "18:00"],
        yAxisLabels: ["£3.00", "£2.00", "£1.00", "£0"],
      };
    } else if (activeWhatIf === "fullBattery") {
      return {
        title: "What if battery was already full?",
        chartTitle: "Grid dependency",
        yAxisLabel: "kWh",
        summary: null,
        causalText: "At 15% SOC, AI prioritised solar charging. Full battery would have exported surplus.",
        metricCards: [
          { label: "Grid import reduced", value: "3.2 kWh" },
          { label: "Excess solar", value: "Exports 2.1 kWh" },
        ],
        chartPaths: {
          actual: "M 0,210 L 50,200 L 100,150 L 150,120 L 200,100 L 250,140 L 300,180 L 350,220 L 400,240",
          actualFill: "M 0,210 L 50,200 L 100,150 L 150,120 L 200,100 L 250,140 L 300,180 L 350,220 L 400,240 L 400,280 L 0,280 Z",
          alternative: "M 0,265 L 50,268 L 100,270 L 150,272 L 200,275 L 250,270 L 300,268 L 350,265 L 400,268",
        },
        actualLegend: "Actual grid use",
        alternativeLegend: "Full battery scenario",
        xAxisLabels: ["00:00", "06:00", "09:00", "14:00", "18:00"],
        yAxisLabels: ["4 kWh", "3 kWh", "2 kWh", "1 kWh", "0"],
      };
    }

    // ── Default: scenario.counterfactual data ─────────────────────────────────
    // Badge, comparison card fields, summary, and legend labels derive from
    // scenario data. SVG chart paths are hardcoded illustrative shapes.

    const { alternativeChargeTime, alternativeRatePence, alternativeCostPence,
            costDeltaPence, co2DeltaKg, note } = counterfactual;

    const chargeBand = findTariffBand(tariffSchedule, chargeWindowStart);
    const chargeBandLabel = chargeBand
      ? `${TARIFF_DISPLAY[chargeBand.label] ?? chargeBand.label} (${formatPounds(chargeBand.ratePence)}/kWh)`
      : undefined;

    // Actual charge session cost (derived: alternativeCostPence − costDeltaPence)
    const actualCostPence = alternativeCostPence !== undefined
      ? alternativeCostPence - costDeltaPence
      : undefined;

    // Summary: use counterfactual.note for counter-intuitive cases (e.g. S2);
    // otherwise construct a sentence from the numeric fields.
    const summary = note
      ? <>{note}</>
      : costDeltaPence > 0
      ? (
        <>
          Scheduling at {chargeWindowStart} instead of {alternativeChargeTime} saves{" "}
          <span style={{ fontWeight: fonts.weight.semibold }}>{formatPounds(costDeltaPence)}</span>{" "}
          and avoids{" "}
          <span style={{ fontWeight: fonts.weight.semibold }}>{co2DeltaKg} kg</span> of additional CO₂.
        </>
      )
      : null;

    return {
      title: "Why did EnergyView make that choice?",
      chartTitle: "Battery level comparison",
      yAxisLabel: "%",
      summary,
      actualCard: {
        time: `Charge at ${chargeWindowStart}`,
        rate: chargeBandLabel,
        cost: actualCostPence !== undefined ? `~${formatPounds(actualCostPence)}` : undefined,
      },
      alternativeCard: {
        badge: formatDeltaBadge(costDeltaPence),
        badgeColor: deltaBadgeColor(costDeltaPence),
        time: `Charge at ${alternativeChargeTime}`,
        rate: alternativeRatePence !== undefined ? `${formatPounds(alternativeRatePence)}/kWh` : undefined,
        cost: alternativeCostPence !== undefined ? `~${formatPounds(alternativeCostPence)}` : undefined,
      },
      // Chart SVG paths are hardcoded — no hourly trajectory data in scenario interface.
      // Only the legend labels derive from scenario data.
      chartPaths: {
        actual: "M 0,196 L 40,196 L 80,28 L 120,28 L 160,28 L 200,43 L 240,60 L 280,80 L 320,99 L 360,118 L 400,125",
        actualFill: "M 0,196 L 40,196 L 80,28 L 120,28 L 160,28 L 200,43 L 240,60 L 280,80 L 320,99 L 360,118 L 400,125 L 400,280 L 0,280 Z",
        alternative: "M 0,196 L 40,196 L 80,196 L 120,196 L 160,196 L 200,196 L 240,196 L 280,69 L 320,69 L 360,97 L 400,112",
      },
      actualLegend: `Actual (${chargeWindowStart})`,
      alternativeLegend: `If scheduled at ${alternativeChargeTime}`,
      xAxisLabels: ["14:00", "16:00", "19:00", "21:00", "23:00"],
      yAxisLabels: ["100%", "67%", "33%", "0%"],
    };
  };

  const whatIfData = getWhatIfContent();
  const factorItems = buildFactorItems(scenario);

  // ── Modal content ────────────────────────────────────────────────────────────

  const modalContent = (
    <>
      {/* Section A: Causal factors — shown for default and lowerSolar what-if only */}
      {(activeWhatIf === null || activeWhatIf === "lowerSolar") && (
        <>
          <div
            style={{
              fontFamily: fonts.family.sans,
              fontSize: 12,
              color: "#1C1C1E",
              fontWeight: fonts.weight.regular,
              marginBottom: 8,
            }}
          >
            EnergyView charged at {chargeWindowStart}–{chargeWindowEnd} because:
          </div>

          {factorItems.map((item, index) => (
            <div
              key={index}
              style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: item.color,
                  marginTop: 5,
                  flexShrink: 0,
                }}
              />
              <div style={{ fontFamily: fonts.family.sans, fontSize: 13, lineHeight: 1.5 }}>
                <span style={{ color: "#374151", fontWeight: fonts.weight.semibold }}>
                  {item.boldText}
                </span>
                {" "}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#1F2937",
                      opacity: item.confidenceOpacity,
                      display: "inline-block",
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: fonts.weight.semibold, color: "#6B7280" }}>
                    {item.confidenceLabel}
                  </span>
                </span>
                <span style={{ color: "#6B7280" }}> — {item.consequenceText}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Section B: Contrastive summary or metric cards */}
      {'metricCards' in whatIfData && whatIfData.metricCards ? (
        <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 8 }}>
          {whatIfData.metricCards.map((card, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                backgroundColor: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: 6,
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontFamily: fonts.family.sans, fontSize: 11, color: "#6B7280", textTransform: "uppercase" }}>
                {card.label}
              </div>
              <div style={{ fontFamily: fonts.family.sans, fontSize: 13, fontWeight: fonts.weight.semibold, color: "#1C1C1E" }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Contrastive summary sentence */}
          {whatIfData.summary && (
            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 8, marginTop: 8, marginBottom: 8 }}>
              <div style={{ fontFamily: fonts.family.sans, fontSize: 12, color: "#1C1C1E", fontWeight: fonts.weight.regular, lineHeight: 1.4, maxHeight: "2.8em", overflow: "hidden" }}>
                {whatIfData.summary}
              </div>
            </div>
          )}

          {/* Section C: Two-column comparison cards */}
          {'actualCard' in whatIfData && whatIfData.actualCard && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {/* Left: Actual decision */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.family.sans, fontSize: 11, textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>
                  Actual decision
                </div>
                <div
                  style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderLeft: "4px solid #F59E0B",
                    borderRadius: 8,
                    padding: 10,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "#F59E0B",
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: fonts.weight.bold,
                      textTransform: "uppercase",
                      padding: "4px 8px",
                      borderRadius: 4,
                    }}
                  >
                    SELECTED
                  </div>
                  <div style={{ fontFamily: fonts.family.sans, fontSize: 13, fontWeight: fonts.weight.semibold, color: "#1C1C1E", marginBottom: 6 }}>
                    {whatIfData.actualCard.time}
                  </div>
                  <div style={{ fontFamily: fonts.family.sans, fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
                    {whatIfData.actualCard.rate && <div>Rate: {whatIfData.actualCard.rate}</div>}
                    {whatIfData.actualCard.cost && <div>Cost: {whatIfData.actualCard.cost}</div>}
                  </div>
                </div>
              </div>

              {/* Right: Alternative scenario */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fonts.family.sans, fontSize: 11, textTransform: "uppercase", color: "#9CA3AF", marginBottom: 6 }}>
                  Alternative scenario
                </div>
                <div
                  style={{
                    backgroundColor: "#F9FAFB",
                    border: "1px solid #E5E7EB",
                    borderLeft: "4px solid #9CA3AF",
                    borderRadius: 8,
                    padding: 10,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: whatIfData.alternativeCard.badgeColor,
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: fonts.weight.bold,
                      textTransform: "uppercase",
                      padding: "4px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {whatIfData.alternativeCard.badge}
                  </div>
                  <div style={{ fontFamily: fonts.family.sans, fontSize: 13, fontWeight: fonts.weight.semibold, color: "#374151", marginBottom: 6 }}>
                    {whatIfData.alternativeCard.time}
                  </div>
                  <div style={{ fontFamily: fonts.family.sans, fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>
                    {whatIfData.alternativeCard.rate && <div>Rate: {whatIfData.alternativeCard.rate}</div>}
                    {whatIfData.alternativeCard.cost && <div>Cost: {whatIfData.alternativeCard.cost}</div>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Section D: Mini comparison chart */}
      <div style={{ marginTop: 8 }}>
        <div style={{ fontFamily: fonts.family.sans, fontSize: 12, fontWeight: fonts.weight.semibold, color: "#374151", marginBottom: 6 }}>
          {whatIfData.chartTitle}
        </div>
        <div
          style={{
            backgroundColor: "#F9FAFB",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            padding: 8,
            paddingLeft: 36,
            paddingBottom: 24,
            position: "relative",
          }}
        >
          {/* Y-axis labels */}
          {whatIfData.yAxisLabels ? (
            <>
              <div style={{ position: "absolute", left: 4, top: 8, fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>{whatIfData.yAxisLabels[0]}</div>
              <div style={{ position: "absolute", left: 4, top: "33%", transform: "translateY(-50%)", fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>{whatIfData.yAxisLabels[1]}</div>
              <div style={{ position: "absolute", left: 4, top: "66%", transform: "translateY(-50%)", fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>{whatIfData.yAxisLabels[2]}</div>
              <div style={{ position: "absolute", left: 4, bottom: 24, fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>{whatIfData.yAxisLabels[3]}</div>
            </>
          ) : (
            <>
              <div style={{ position: "absolute", left: 4, top: 8, fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>100%</div>
              <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>50%</div>
              <div style={{ position: "absolute", left: 12, bottom: 24, fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>0%</div>
            </>
          )}

          <svg width="100%" height="180" viewBox="0 0 400 280" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="400" y2="0" stroke="#E5E7EB" strokeWidth="1" />
            <line x1="0" y1="93" x2="400" y2="93" stroke="#E5E7EB" strokeWidth="1" />
            <line x1="0" y1="186" x2="400" y2="186" stroke="#E5E7EB" strokeWidth="1" />
            <line x1="0" y1="280" x2="400" y2="280" stroke="#E5E7EB" strokeWidth="1" />

            {/* Actual trajectory */}
            <path
              d={whatIfData.chartPaths.actual}
              fill="none"
              stroke={activeWhatIf === "peakRate" || activeWhatIf === "fullBattery" ? "#2563EB" : "#F59E0B"}
              strokeWidth="2.5"
            />
            <path
              d={whatIfData.chartPaths.actualFill}
              fill={activeWhatIf === "peakRate" || activeWhatIf === "fullBattery" ? "#2563EB" : "#F59E0B"}
              fillOpacity="0.1"
            />

            {/* Alternative trajectory */}
            <path
              d={whatIfData.chartPaths.alternative}
              fill="none"
              stroke={activeWhatIf === "peakRate" ? "#EF4444" : activeWhatIf === "fullBattery" ? "#10B981" : "#9CA3AF"}
              strokeWidth="2.5"
              strokeDasharray="6,4"
            />
          </svg>

          {/* X-axis labels */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            {whatIfData.xAxisLabels.map((label, idx) => (
              <span key={idx} style={{ fontFamily: fonts.family.sans, fontSize: 10, color: "#9CA3AF" }}>{label}</span>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, marginTop: 6, justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 16, height: 2, backgroundColor: activeWhatIf === "peakRate" || activeWhatIf === "fullBattery" ? "#2563EB" : "#F59E0B" }} />
            <span style={{ fontFamily: fonts.family.sans, fontSize: 11, color: "#6B7280" }}>
              {whatIfData.actualLegend}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div
              style={{
                width: 16,
                height: 2,
                backgroundColor: activeWhatIf === "peakRate" ? "#EF4444" : activeWhatIf === "fullBattery" ? "#10B981" : "#9CA3AF",
                backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 6px, #F9FAFB 6px, #F9FAFB 10px)",
              }}
            />
            <span style={{ fontFamily: fonts.family.sans, fontSize: 11, color: "#6B7280" }}>
              {whatIfData.alternativeLegend}
            </span>
          </div>
        </div>
      </div>

      {/* Causal text for peakRate and fullBattery what-if chips */}
      {'causalText' in whatIfData && whatIfData.causalText && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #E5E7EB" }}>
          <div style={{ fontFamily: fonts.family.sans, fontSize: 12, color: "#1C1C1E", lineHeight: 1.4, maxHeight: "2.8em", overflow: "hidden" }}>
            {whatIfData.causalText}
          </div>
        </div>
      )}
    </>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Shell>
      <Header batterySOC={batterySOC} chargingState={chargingState} />

      <SummaryCard
        text={notificationText}
        costText={costText}
        forecastAccuracy={forecastAccuracy}
        showModifyButton={showModifyButton}
        onExplainClick={() => setIsModalOpen(true)}
      />

      <TemporalNav variant="hatched" showCausalContext={true} onDayChange={setSelectedDayInfo} weatherDescription={scenario.weather} hourlySOC={scenario.hourlySOC} tariffSchedule={scenario.tariffSchedule} hourlyCarbon={scenario.hourlyCarbon} hourlySolar={scenario.hourlySolar} hourlyConsumption={scenario.hourlyConsumption} hourlyGridFlow={hourlyGridFlow} />

      {/* Modal overlay */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsModalOpen(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              zIndex: 100,
            }}
          />

          {/* Modal */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              height: "80%",
              overflow: "hidden",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: 12,
              padding: 16,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.16)",
              zIndex: 101,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#1F2937"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#6B7280"; }}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                width: 20,
                height: 20,
                background: "none",
                border: "none",
                fontSize: 20,
                color: "#6B7280",
                cursor: "pointer",
                lineHeight: 1,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 0.2s",
              }}
            >
              ✕
            </button>

            {/* Modal title */}
            <h2 style={{ fontFamily: fonts.family.sans, fontSize: 16, fontWeight: fonts.weight.bold, color: "#1C1C1E", marginTop: 0, marginBottom: 8, paddingRight: 32 }}>
              {whatIfData.title}
            </h2>

            {/* What-if chip row (hardcoded, Option A) */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {(["lowerSolar", "peakRate", "fullBattery"] as const).map((chip) => {
                const labels: Record<string, string> = {
                  lowerSolar: "Solar 50% lower",
                  peakRate: "Peak rate",
                  fullBattery: "Battery full",
                };
                const isActive = activeWhatIf === chip;
                return (
                  <button
                    key={chip}
                    onClick={() => setActiveWhatIf(isActive ? null : chip)}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "#FFFFFF"; }}
                    style={{
                      backgroundColor: "#FFFFFF",
                      border: isActive ? "2px solid #2563EB" : "1px solid #D1D5DB",
                      borderRadius: 16,
                      padding: "4px 10px",
                      fontFamily: fonts.family.sans,
                      fontSize: 12,
                      color: "#374151",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                  >
                    {labels[chip]}
                  </button>
                );
              })}
            </div>

            {/* Modal content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
              {modalContent}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
