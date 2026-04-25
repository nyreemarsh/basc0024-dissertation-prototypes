import { useState } from "react";
import { Shell } from "./components/shared/Shell";
import { Header } from "./components/shared/Header";
import { SummaryCard } from "./components/shared/SummaryCard";
import { TemporalNav } from "./components/shared/TemporalNav";
import { useScenario } from "../context/ScenarioContext";
import { computeHourlyGridFlow, resolveNow } from "../scenarios/derivations";

/** Parses the hour component from a 'HH:MM' string. */
function toHour(hhmm: string): number {
  return parseInt(hhmm.split(':')[0], 10);
}

/** Formats a pence integer as a £-prefixed display string. e.g. 185 → '£1.85'. */
function formatPounds(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

/**
 * Prototype A — Baseline / Minimally Explainable (DR7)
 *
 * Baseline prototype. Identical to shared visual foundation with no additions.
 * The AI's charging decision is visible as a labelled marker on the timeline.
 * The battery SOC% trajectory shows the consequence of that decision.
 *
 * Deliberately withholds:
 * - No causal factors named
 * - No explanation of why the charge time was chosen
 * - No solar forecast, grid pricing, or battery headroom surfaced
 * - No uncertainty or counterfactual information
 *
 * Forecast encoding: solid fill at 40% opacity (variant="solid")
 */
export function PrototypeA() {
  const scenario = useScenario();
  const hourlyGridFlow = computeHourlyGridFlow(scenario);

  // Resolve current time — pinned to scenario.nowOverride when set
  const { currentHour, currentMinutes, todayISO } = resolveNow(scenario);

  // Derive charge window bounds from scenario data
  const chargeStart = toHour(scenario.chargeWindowStart);
  const chargeEnd = toHour(scenario.chargeWindowEnd);

  // Track selected day from TemporalNav
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

  // Calculate battery SOC based on CURRENT real time (not selected day).
  // Uses scenario.batterySOCPct as the pre-charge baseline, interpolating
  // linearly to 100% over the charge window.
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

  // Determine charging state based on CURRENT real time (not selected day)
  let chargingState: "charging-solar" | "charging-grid" | "discharging" | "idle" = "idle";
  if (isDuringCharge) {
    chargingState = "charging-grid";
  }

  // Determine notification text for SummaryCard based on selected day
  let notificationText = "";
  if (selectedDayInfo.isToday && isBeforeCharge) {
    notificationText = `Your battery is scheduled to charge today at ${scenario.chargeWindowStart}. Charging will complete by ${scenario.chargeWindowEnd}.`;
  } else if (selectedDayInfo.isToday && isDuringCharge) {
    notificationText = `Your battery is charging now. Started at ${scenario.chargeWindowStart}, scheduled to complete by ${scenario.chargeWindowEnd}.`;
  } else if (selectedDayInfo.isToday && isAfterCharge) {
    notificationText = `Your battery finished charging today at ${scenario.chargeWindowEnd}. Battery is now at 100%.`;
  } else if (selectedDayInfo.isPast) {
    notificationText = `Battery charged at ${scenario.chargeWindowStart}. Charging completed at ${scenario.chargeWindowEnd}.`;
  } else if (selectedDayInfo.isFuture) {
    notificationText = `Battery is scheduled to charge at ${scenario.chargeWindowStart}. Charging will complete by ${scenario.chargeWindowEnd}.`;
  }

  // Calculate cost text based on selected day
  const costToday = formatPounds(scenario.costTodayPence);
  const savingsToday = formatPounds(scenario.savingsPence);
  const co2Today = `${scenario.co2AvoidedKg} kg`;

  let costText = "";
  if (selectedDayInfo.isToday) {
    costText = `Estimated cost today: ${costToday} · Estimated savings: ${savingsToday} · CO₂ avoided: ${co2Today}`;
  } else if (selectedDayInfo.isPast) {
    // Past-day values are illustrative UI scaffolding — not scenario-specific data
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
    // Future forecast values are illustrative UI scaffolding — not scenario-specific data
    costText = "Forecast cost: £3.15 · Forecast savings: £1.10 · Forecast CO₂ avoided: 2.3 kg";
  }

  // DR5: Show modify button only on today when charge is scheduled or in progress (not after)
  const showModifyButton = selectedDayInfo.isToday && !isAfterCharge;

  return (
    <Shell>
      <Header batterySOC={batterySOC} chargingState={chargingState} />

      <SummaryCard
        text={notificationText}
        costText={costText}
        showModifyButton={showModifyButton}
      />

      <TemporalNav variant="solid" onDayChange={setSelectedDayInfo} weatherDescription={scenario.weather} hourlySOC={scenario.hourlySOC} tariffSchedule={scenario.tariffSchedule} hourlyCarbon={scenario.hourlyCarbon} hourlySolar={scenario.hourlySolar} hourlyConsumption={scenario.hourlyConsumption} hourlyGridFlow={hourlyGridFlow} userOverride={scenario.userOverride} nowOverride={scenario.nowOverride} scenarioDate={scenario.date} />
    </Shell>
  );
}
