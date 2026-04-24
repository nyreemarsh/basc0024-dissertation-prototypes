import type { Scenario } from './types';

/**
 * Scenario 1 — Routine charging decision
 *
 * Clear spring Monday. Battery at 15% at midnight. AI schedules charging
 * for 08:00–10:00 to capture the overnight low rate (7p) transitioning
 * to the daytime rate (17p), ahead of solar peaking at 10:00–14:00.
 *
 * Primary causal driver: grid pricing (off-peak available at 08:00)
 * Tests: baseline comprehension of AI scheduling logic
 */
export const scenario1: Scenario = {
  id: '1',
  label: 'Routine charging decision',
  date: '2026-04-20',
  weather: 'clear spring day',

  batteryCapacityKWh: 10,
  batterySOCPct: 15,
  batterySOCReferenceTime: '00:00',

  chargeWindowStart: '08:00',
  chargeWindowEnd: '10:00',

  tariffSchedule: [
    { from: '00:00', to: '07:00', ratePence: 7,  label: 'overnight-low' },
    { from: '07:00', to: '16:00', ratePence: 17, label: 'daytime' },
    { from: '16:00', to: '19:00', ratePence: 28, label: 'peak' },
    { from: '19:00', to: '23:00', ratePence: 19, label: 'post-peak' },
    { from: '23:00', to: '00:00', ratePence: 7,  label: 'overnight-low' },
  ],

  solarForecast: {
    peakWindowStart: '10:00',
    peakWindowEnd: '14:00',
    peakRateKWhPerHour: 3.0,
    confidenceQualifier: 'high',
    confidenceVariancePct: 8,
  },

  carbonIntensity: [
    { time: '08:00', gCO2perKWh: 160 },
    { time: '10:00', gCO2perKWh: 95 },
  ],

  costTodayPence: 185,
  savingsPence: 135,
  savingsBreakdown: { solarPence: 85, offPeakPence: 50 },  // 85 + 50 = 135 ✓
  co2AvoidedKg: 2.1,

  causalFactors: {
    solar: 'moderate',
    gridPricing: 'primary',
    carbonIntensity: 'none',
    batteryHeadroom: 'moderate',
    userPreference: 'none',
  },

  forecastAccuracyPct: 87,
  forecastVariancePct: 8,

  // 00–07: flat at 15% (pre-charge); 08: mid-charge 58%; 09–10: 100%
  // 10–23: gradual household discharge 100%→75%
  hourlySOC: [15, 15, 15, 15, 15, 15, 15, 15, 58, 100, 100, 98, 96, 94, 92, 90, 88, 86, 84, 82, 80, 78, 76, 75],

  // Clear spring day: high overnight carbon (gas baseload), drops sharply as solar ramps 09–14, recovers evening
  hourlyCarbon: [210, 205, 200, 195, 190, 180, 170, 165, 160, 150, 120, 100, 95, 100, 110, 130, 150, 170, 180, 185, 185, 180, 175, 170],

  // Clear spring day: solar peaks 11:00–13:00 at 3.0 kWh
  hourlySolar: [0, 0, 0, 0, 0, 0, 0.3, 0.8, 1.4, 2.0, 2.8, 3.0, 3.0, 2.9, 2.6, 2.0, 1.2, 0.5, 0.1, 0, 0, 0, 0, 0],

  // Standard UK household profile
  hourlyConsumption: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.8, 1.5, 1.8, 0.9, 0.8, 0.9, 1.1, 1.2, 1.0, 0.9, 1.0, 1.2, 1.8, 2.5, 2.8, 2.5, 2.0, 1.2],

  counterfactual: {
    alternativeChargeTime: '18:30',
    alternativeRatePence: 28,
    alternativeCostPence: 196,
    costDeltaPence: 147,
    co2DeltaKg: 1.4,
  },
};
