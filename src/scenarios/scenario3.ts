import type { Scenario } from './types';

/**
 * Scenario 3 — AI override of user preference
 *
 * Cloudy Thursday afternoon. Battery at 40% at 14:00. User has manually
 * scheduled washing machine + dishwasher to run 16:00–18:00, expecting
 * the grid rate to hold at the forecast 19p/kWh.
 *
 * By 15:00 an unexpected demand surge pushes the grid rate to 34p/kWh
 * (15:00–17:00). The AI overrides the user's manual schedule and
 * reschedules appliance operation to 18:30–20:30 when the rate is
 * forecast to return to 20p/kWh.
 *
 * Forecast accuracy is lower than usual (62%) — this explains why the
 * spike was not pre-empted and surfaces the AI's reactive behaviour.
 *
 * Primary causal driver: unexpected price spike (grid pricing)
 * Tests: perceived agency and trust under AI override
 */
export const scenario3: Scenario = {
  id: '3',
  label: 'AI override of user preference',
  date: '2026-04-23',
  weather: 'cloudy afternoon',

  batteryCapacityKWh: 10,
  batterySOCPct: 40,
  batterySOCReferenceTime: '14:00',

  // chargeWindowStart/End here represents the AI's rescheduled appliance
  // operation window (battery discharge + appliance run)
  chargeWindowStart: '18:30',
  chargeWindowEnd: '20:30',
  userExpectedChargeTime: '16:00',

  tariffSchedule: [
    { from: '00:00', to: '07:00', ratePence: 7,  label: 'overnight-low' },
    { from: '07:00', to: '15:00', ratePence: 19, label: 'daytime' },
    { from: '15:00', to: '17:00', ratePence: 34, label: 'spike' },
    { from: '17:00', to: '18:30', ratePence: 22, label: 'post-spike' },
    { from: '18:30', to: '23:00', ratePence: 20, label: 'post-peak' },
    { from: '23:00', to: '00:00', ratePence: 7,  label: 'overnight-low' },
  ],

  solarForecast: {
    peakRateKWhPerHour: 0.8,
    confidenceQualifier: 'moderate',
  },

  carbonIntensity: [
    { time: '15:00', gCO2perKWh: 245 },
    { time: '18:30', gCO2perKWh: 155 },
  ],

  costTodayPence: 275,
  savingsPence: 170,
  co2AvoidedKg: 1.4,

  causalFactors: {
    solar: 'none',
    gridPricing: 'primary',
    carbonIntensity: 'none',
    batteryHeadroom: 'none',
    userPreference: 'low',
  },

  forecastAccuracyPct: 62,

  counterfactual: {
    alternativeChargeTime: '16:00',
    costDeltaPence: 170,
    co2DeltaKg: 0.4,
  },

  userOverride: {
    originalScheduleDescription: 'washing machine + dishwasher',
    originalWindowStart: '16:00',
    originalWindowEnd: '18:00',
    originalForecastRatePence: 19,
    spikeWindowStart: '15:00',
    spikeWindowEnd: '17:00',
    actualSpikeRatePence: 34,
    overrideTargetStart: '18:30',
    overrideTargetEnd: '20:30',
    overrideTargetForecastRatePence: 20,
    overrideReason:
      'Grid prices spiked to 34p/kWh from 15:00, well above the original forecast of 19p/kWh. EnergyView rescheduled appliance operation to 18:30 when prices are forecast to return to 20p/kWh, saving £1.70.',
    costWithoutOverridePence: 445,
  },
};
