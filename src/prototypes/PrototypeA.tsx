import { useState } from "react";
import { Shell } from "./components/shared/Shell";
import { Header } from "./components/shared/Header";
import { SummaryCard } from "./components/shared/SummaryCard";
import { TemporalNav } from "./components/shared/TemporalNav";

/**
 * Prototype A — Baseline / Minimally Explainable (DR7)
 *
 * Baseline prototype. Identical to shared visual foundation with no additions.
 * The AI's charging decision at 14:00 is visible as a labelled marker on the
 * timeline. The battery SOC% trajectory shows the consequence of that decision.
 *
 * Deliberately withholds:
 * - No causal factors named
 * - No explanation of why 14:00 was chosen
 * - No solar forecast, grid pricing, or battery headroom surfaced
 * - No uncertainty or counterfactual information
 *
 * Forecast encoding: solid fill at 40% opacity (variant="solid")
 */
export function PrototypeA() {
  // Time-aware charging state (same logic as CHARGED pill)
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const chargeStart = 14;
  const chargeEnd = 16;

  const todayISO = now.toISOString().split("T")[0];

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

  // Calculate battery SOC based on CURRENT real time (not selected day)
  // This value stays constant regardless of which day the user is viewing
  let batterySOC = 37; // default baseline (pre-charge level)
  if (isDuringCharge) {
    // Interpolate based on current real time progress through charge window
    const minutesSinceChargeStart = (currentHour - chargeStart) * 60 + currentMinutes;
    const totalChargeMinutes = (chargeEnd - chargeStart) * 60;
    batterySOC = Math.round(37 + ((100 - 37) * minutesSinceChargeStart / totalChargeMinutes));
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
    notificationText = "Your battery is scheduled to charge today at 14:00. Charging will complete by 16:00.";
  } else if (selectedDayInfo.isToday && isDuringCharge) {
    notificationText = "Your battery is charging now. Started at 14:00, scheduled to complete by 16:00.";
  } else if (selectedDayInfo.isToday && isAfterCharge) {
    notificationText = "Your battery finished charging today at 16:00. Battery is now at 100%.";
  } else if (selectedDayInfo.isPast) {
    notificationText = "Battery charged at 14:00. Charging completed at 16:00.";
  } else if (selectedDayInfo.isFuture) {
    notificationText = "Battery is scheduled to charge at 14:00. Charging will complete by 16:00.";
  }

  // Calculate cost text based on selected day
  let costText = "";
  if (selectedDayInfo.isToday) {
    costText = "Estimated cost today: £3.40 · Estimated savings: £1.20 · CO₂ avoided: 2.1 kg";
  } else if (selectedDayInfo.isPast) {
    // Mock different values for different past days
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

      <TemporalNav variant="solid" onDayChange={setSelectedDayInfo} />
    </Shell>
  );
}