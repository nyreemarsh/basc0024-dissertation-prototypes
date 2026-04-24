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
  savingsBreakdown: { solarPence: 20, offPeakPence: 150 },  // 20 + 150 = 170 ✓
  co2AvoidedKg: 1.4,

  causalFactors: {
    solar: 'none',
    gridPricing: 'primary',
    carbonIntensity: 'none',
    batteryHeadroom: 'none',
    userPreference: 'low',
  },

  forecastAccuracyPct: 62,

  // 00–07: starts at 30%, overnight drain to 25%
  // 08–13: cloudy solar recovery 26%→40%; 14: holds at 40% (reference time)
  // 15–17: light discharge during demand surge 40%→34%
  // 18: holds at 34% pre-charge; 18:30–20:30 AI charge (+half-hr boundary modelled per-hour):
  //   h=18 end (0.5hr charged): 55%; h=19 end (1.5hr charged): 85%; h=20 end (2hr): 100%
  // 21–23: post-charge household discharge 100%→85%
  hourlySOC: [30, 28, 26, 25, 25, 26, 28, 30, 32, 34, 36, 38, 39, 40, 40, 38, 36, 34, 55, 85, 100, 97, 93, 85],

  // Cloudy day: moderate carbon throughout; elevated during 15:00–17:00 demand surge; cleaner post-18:30 as demand drops
  hourlyCarbon: [190, 185, 180, 175, 170, 175, 180, 185, 195, 210, 220, 225, 230, 240, 245, 245, 250, 245, 220, 180, 165, 160, 155, 150],

  // Cloudy afternoon: low solar ceiling at 0.8 kWh, peaks 13:00–14:00
  hourlySolar: [0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.8, 0.7, 0.5, 0.3, 0.1, 0, 0, 0, 0, 0],

  // Appliances rescheduled to 18:30–20:30 → consumption spike at 19:00–20:00
  // 19:00 = base 2.5 + appliances 1.8 = 4.3; 20:00 = base 2.5 + appliances 1.5 = 4.0
  hourlyConsumption: [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.8, 1.5, 1.8, 0.9, 0.8, 0.9, 1.1, 1.2, 1.0, 0.9, 1.0, 1.2, 2.5, 4.3, 4.0, 2.0, 1.2, 0.6],

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
