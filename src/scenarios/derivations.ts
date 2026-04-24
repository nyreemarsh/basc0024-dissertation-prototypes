import type { Scenario } from './types';

/**
 * Derives a 24-element net grid flow array (kWh per hour, 00:00–23:00) from
 * existing scenario data.
 *
 *   gridFlow[h] = (consumption[h] − solar[h]) + batteryCharging[h]
 *
 * batteryCharging is positive when the battery is charging (draws from grid)
 * and negative when it is discharging (supplies the home, reducing grid draw).
 *
 * Positive result  → household/battery is importing from the grid.
 * Negative result  → surplus solar/battery is being exported to the grid.
 *
 * Midnight wraparound fix: the last hour (h=23) uses socDelta=0 to avoid
 * an artificial discharge spike caused by wrapping back to hourlySOC[0].
 */
export function computeHourlyGridFlow(scenario: Scenario): number[] {
  const { hourlySOC, hourlySolar, hourlyConsumption, batteryCapacityKWh } = scenario;

  return Array.from({ length: 24 }, (_, h) => {
    // No wraparound at midnight — treat the last hour as battery-stable
    const socDelta = h < 23 ? hourlySOC[h + 1] - hourlySOC[h] : 0;
    const batteryPowerKWh = (socDelta / 100) * batteryCapacityKWh;

    const netHouseholdDemand = hourlyConsumption[h] - hourlySolar[h];
    return netHouseholdDemand + batteryPowerKWh;
  });
}
