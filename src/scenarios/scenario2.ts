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

  counterfactual: {
    alternativeChargeTime: '08:00',
    alternativeRatePence: 14,
    costDeltaPence: -8,
    co2DeltaKg: 1.6,
    note: 'Charging at 08:00 costs virtually the same (−8p) but produces 1.6 kg more CO₂ due to elevated grid carbon intensity at that time. The AI prioritised carbon reduction over the marginal cost difference.',
  },
};
