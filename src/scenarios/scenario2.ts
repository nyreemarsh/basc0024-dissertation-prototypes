import type { Scenario } from './types';

/**
 * Scenario 2 — Solar vs carbon conflict
 *
 * Sunny Wednesday morning. Battery at 25% at 08:00. Solar forecast is high
 * (10:00–14:00) and the user expects charging to begin immediately. However,
 * grid carbon intensity at 08:00 is 280 gCO₂/kWh due to overnight wind
 * dropping. AI delays charging to 11:00 when carbon intensity is forecast
 * to fall to 145 gCO₂/kWh as wind recovers and solar ramps.
 *
 * Cost result is counter-intuitive: the delayed charge costs only 8p more
 * (same 14p/kWh daytime rate applies throughout), but avoids 1.6 kg CO₂.
 *
 * Primary causal driver: carbon intensity
 * Tests: trade-off reasoning — why AI chose worse cost for better carbon
 */
export const scenario2: Scenario = {
  id: '2',
  label: 'Solar vs carbon conflict',
  date: '2026-04-22',
  weather: 'sunny morning',

  batteryCapacityKWh: 10,
  batterySOCPct: 25,
  batterySOCReferenceTime: '08:00',

  chargeWindowStart: '11:00',
  chargeWindowEnd: '14:00',
  userExpectedChargeTime: '08:00',

  tariffSchedule: [
    { from: '00:00', to: '07:00', ratePence: 7,  label: 'overnight-low' },
    { from: '07:00', to: '16:00', ratePence: 14, label: 'daytime' },
    { from: '16:00', to: '19:00', ratePence: 26, label: 'peak' },
    { from: '19:00', to: '23:00', ratePence: 19, label: 'post-peak' },
    { from: '23:00', to: '00:00', ratePence: 7,  label: 'overnight-low' },
  ],

  solarForecast: {
    peakWindowStart: '10:00',
    peakWindowEnd: '14:00',
    peakRateKWhPerHour: 3.5,
    confidenceQualifier: 'high',
  },

  carbonIntensity: [
    { time: '08:00', gCO2perKWh: 280 },
    { time: '11:00', gCO2perKWh: 145 },
    { time: '14:00', gCO2perKWh: 95 },
  ],

  costTodayPence: 140,
  savingsPence: 195,
  savingsBreakdown: { solarPence: 145, offPeakPence: 50 },  // 145 + 50 = 195 ✓
  co2AvoidedKg: 2.8,

  causalFactors: {
    solar: 'high',
    gridPricing: 'low',
    carbonIntensity: 'primary',
    batteryHeadroom: 'none',
    userPreference: 'none',
  },

  forecastAccuracyPct: 91,
  forecastVariancePct: 5,

  // 00–07: overnight base-load drain 20%→18%, then early solar rise to 25% by 08:00
  // 08–10: holds at 25% (AI holds off charging for carbon reasons)
  // 11–13: charge 25%→100% over 3 hours; 14–23: household discharge 100%→75%
  hourlySOC: [20, 19, 18, 18, 18, 19, 20, 22, 25, 25, 25, 50, 75, 100, 97, 94, 92, 89, 86, 84, 81, 78, 76, 75],

  // Wind drops overnight → elevated carbon through morning; drops sharply at 11:00 as wind recovers + solar peaks; recovers gradually evening
  hourlyCarbon: [220, 225, 230, 240, 250, 260, 270, 280, 290, 285, 260, 145, 120, 100, 95, 110, 130, 160, 185, 200, 210, 215, 220, 215],

  // Sunny morning: solar peaks 11:00–13:00 at 3.5 kWh
  hourlySolar: [0, 0, 0, 0, 0, 0, 0.4, 1.0, 1.8, 2.4, 3.2, 3.5, 3.5, 3.3, 2.9, 2.2, 1.4, 0.6, 0.2, 0, 0, 0, 0, 0],

  // Standard UK household profile (same as S1)
  hourlyConsumption: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.8, 1.5, 1.8, 0.9, 0.8, 0.9, 1.1, 1.2, 1.0, 0.9, 1.0, 1.2, 1.8, 2.5, 2.8, 2.5, 2.0, 1.2],

  counterfactual: {
    alternativeChargeTime: '08:00',
    alternativeRatePence: 14,
    costDeltaPence: -8,
    co2DeltaKg: 1.6,
    note: 'Charging at 08:00 costs virtually the same (−8p) but produces 1.6 kg more CO₂ due to elevated grid carbon intensity at that time. The AI prioritised carbon reduction over the marginal cost difference.',
  },

  nowOverride: '09:00',
};
