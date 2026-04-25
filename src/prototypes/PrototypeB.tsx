import { useState } from "react";
import { Shell } from "./components/shared/Shell";
import { Header } from "./components/shared/Header";
import { SummaryCard } from "./components/shared/SummaryCard";
import { TemporalNav } from "./components/shared/TemporalNav";
import { colors, fonts } from "./tokens";
import { useScenario } from "../context/ScenarioContext";
import type { CausalFactors, FactorWeight, Scenario, TariffBand } from "../scenarios/types";
import { computeHourlyGridFlow, resolveNow } from "../scenarios/derivations";

/**
 * Prototype B — Comprehensible (DR8)
 *
 * Inherits: All of Prototype A (including time-aware charging state logic)
 * Adds: Causal explanation inline expansion with named factor blocks,
 *       derived from scenario.causalFactors and ordered by weight.
 *       Savings breakdown surfaced in cost line (solar · off-peak split).
 *
 * DR8: Causal factors driving AI decisions must be named and visually
 *      associated with the decision they explain.
 *
 * Still withholds:
 * - No uncertainty ranges (solar forecast bar is solid, implying certainty)
 * - No comparison with alternative decisions
 *
 * Forecast encoding: solid fill at 40% opacity (variant="solid")
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parses the hour component from a 'HH:MM' string. */
function toHour(hhmm: string): number {
  return parseInt(hhmm.split(':')[0], 10);
}

/** Formats a pence integer as a £-prefixed display string. e.g. 85 → '£0.85'. */
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

// ── Causal factor rendering ───────────────────────────────────────────────────

const WEIGHT_ORDER: FactorWeight[] = ['primary', 'high', 'moderate', 'low'];
const FACTOR_KEYS: (keyof CausalFactors)[] = [
  'solar', 'gridPricing', 'carbonIntensity', 'batteryHeadroom', 'userPreference',
];

interface FactorItem {
  color: string;
  boldText: string;
  consequenceText: string;
}

/**
 * Builds the ordered list of causal factor display items from scenario data.
 * Factors with weight 'none' are excluded. Remaining factors are sorted
 * primary → high → moderate → low.
 *
 * Bold text is derived from scenario fields where possible.
 * Consequence text is kept as generic fixed phrases — see inline notes.
 */
function buildFactorItems(scenario: Scenario): FactorItem[] {
  const {
    causalFactors, solarForecast, tariffSchedule, savingsBreakdown,
    batterySOCPct, chargeWindowStart, carbonIntensity, userOverride,
  } = scenario;

  const chargeBand = findTariffBand(tariffSchedule, chargeWindowStart);
  const chargeBandRate = chargeBand?.ratePence ?? 0;
  const chargeBandUntil = chargeBand?.to ?? '00:00';

  const factorConfig: Record<keyof CausalFactors, FactorItem> = {
    solar: {
      color: "#E8971A",
      boldText:
        solarForecast.peakWindowStart && solarForecast.peakWindowEnd
          ? `Solar generation peaks ${solarForecast.peakWindowStart}–${solarForecast.peakWindowEnd}`
          : "Solar generation forecast",
      consequenceText: "maximising free energy capture",
    },
    gridPricing: {
      color: "#2FA75A",
      boldText: `Grid tariff is ${formatPounds(chargeBandRate)}/kWh until ${chargeBandUntil}`,
      // Note: "before the price rise" is accurate for S1/S2 but less precise for S3
      // (spike avoidance). A per-scenario consequenceText field would fix this.
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
    .map(key => factorConfig[key]);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PrototypeB() {
  const scenario = useScenario();
  const hourlyGridFlow = computeHourlyGridFlow(scenario);
  const {
    chargeWindowStart, chargeWindowEnd,
    costTodayPence, savingsPence, savingsBreakdown, co2AvoidedKg,
  } = scenario;

  // Resolve current time — pinned to scenario.nowOverride when set
  const { currentHour, currentMinutes, todayISO } = resolveNow(scenario);

  const chargeStart = toHour(chargeWindowStart);
  const chargeEnd = toHour(chargeWindowEnd);

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

  // Battery SOC — interpolated from scenario baseline to 100% over charge window
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

  // Notification text — time-aware, same pattern as PrototypeA
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

  // Cost text — today includes savings breakdown (PrototypeB's addition);
  // past/future use illustrative scaffolding values as in PrototypeA
  let costText = "";
  if (selectedDayInfo.isToday) {
    costText = [
      `Estimated cost today: ${formatPounds(costTodayPence)}`,
      `Estimated savings: ${formatPounds(savingsPence)} (${formatPounds(savingsBreakdown.solarPence)} solar · ${formatPounds(savingsBreakdown.offPeakPence)} off-peak)`,
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

  // DR5: Show modify button only on today before charge completes
  const showModifyButton = selectedDayInfo.isToday && !isAfterCharge;

  const factorItems = buildFactorItems(scenario);

  const explanationContent = (
    <div>
      <div
        style={{
          fontFamily: fonts.family.sans,
          fontSize: 14,
          color: "#1C1C1E",
          fontWeight: fonts.weight.regular,
          marginBottom: 12,
        }}
      >
        EnergyView charged at {chargeWindowStart}–{chargeWindowEnd} because:
      </div>

      {factorItems.map((item, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: index < factorItems.length - 1 ? 10 : 0,
          }}
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
            <span style={{ color: "#6B7280" }}> — {item.consequenceText}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Shell>
      <Header batterySOC={batterySOC} chargingState={chargingState} />

      <SummaryCard
        text={notificationText}
        costText={costText}
        showModifyButton={showModifyButton}
        expandableExplanation={explanationContent}
      />

      <TemporalNav variant="solid" showCausalContext={true} onDayChange={setSelectedDayInfo} weatherDescription={scenario.weather} hourlySOC={scenario.hourlySOC} tariffSchedule={scenario.tariffSchedule} hourlyCarbon={scenario.hourlyCarbon} hourlySolar={scenario.hourlySolar} hourlyConsumption={scenario.hourlyConsumption} hourlyGridFlow={hourlyGridFlow} userOverride={scenario.userOverride} nowOverride={scenario.nowOverride} scenarioDate={scenario.date} />
    </Shell>
  );
}
