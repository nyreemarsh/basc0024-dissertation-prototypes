// ── Constrained union types ──────────────────────────────────────────────────

/** Qualitative confidence level for a forecast value. */
export type ConfidenceQualifier = 'high' | 'moderate' | 'low';

/**
 * Relative weight of a causal factor in the AI's decision.
 *   'primary'  — the dominant driver (only one factor should be primary per scenario)
 *   'high'     — strongly contributing but not primary
 *   'moderate' — contributing but secondary
 *   'low'      — minor contribution, may be superseded
 *   'none'     — not relevant in this scenario
 */
export type FactorWeight = 'primary' | 'high' | 'moderate' | 'low' | 'none';

// ── Supporting types ─────────────────────────────────────────────────────────

/**
 * A contiguous time band with a fixed tariff rate.
 * 'from' is inclusive, 'to' is exclusive (e.g. from='07:00' to='16:00'
 * means the rate applies at 07:00 and ends just before 16:00).
 * A 'to' value of '00:00' represents end-of-day (midnight).
 */
export interface TariffBand {
  from: string;       // 'HH:MM' 24-hour
  to: string;         // 'HH:MM' 24-hour; '00:00' = end of day
  ratePence: number;  // pence per kWh
  label: string;      // 'overnight-low' | 'daytime' | 'peak' | 'post-peak' | 'post-spike' | 'spike'
}

/**
 * A point-in-time carbon intensity reading.
 * Each reading applies FROM its time until the next entry in the array.
 */
export interface CarbonIntensityReading {
  time: string;        // 'HH:MM' 24-hour
  gCO2perKWh: number;
}

/**
 * Solar generation forecast for the scenario day.
 * peakWindowStart / peakWindowEnd are optional because some scenarios
 * (e.g. Scenario 3, cloudy afternoon) have no meaningful peak window to specify.
 */
export interface SolarForecast {
  peakWindowStart?: string;         // 'HH:MM' — omit when no defined peak window
  peakWindowEnd?: string;           // 'HH:MM' — omit when no defined peak window
  peakRateKWhPerHour: number;       // kWh generated per hour at peak
  confidenceQualifier: ConfidenceQualifier;
  confidenceVariancePct?: number;   // e.g. 8 means ±8%; omit if not specified
}

/**
 * Relative weights of the five causal factors that can drive
 * an AI decision across all three scenarios.
 */
export interface CausalFactors {
  solar: FactorWeight;
  gridPricing: FactorWeight;
  carbonIntensity: FactorWeight;
  batteryHeadroom: FactorWeight;
  userPreference: FactorWeight;
}

/**
 * Counterfactual data consumed by Prototype D's contrastive drawer.
 * Describes the next-best alternative the AI considered and rejected.
 *
 * costDeltaPence: cost of the alternative vs actual.
 *   Positive = alternative is more expensive than what AI chose.
 *   Negative = alternative is cheaper (as in Scenario 2's counter-intuitive result).
 *
 * co2DeltaKg: CO₂ impact of the alternative vs actual.
 *   Positive = alternative produces more CO₂.
 *   Negative = alternative produces less CO₂.
 */
export interface Counterfactual {
  alternativeChargeTime: string;   // 'HH:MM' — the rejected option
  alternativeRatePence?: number;   // tariff rate at that time in pence, if specified
  alternativeCostPence?: number;   // total charge cost in pence, if specified
  costDeltaPence: number;          // cost of alternative vs actual (positive = more expensive)
  co2DeltaKg: number;              // CO₂ of alternative vs actual (positive = more CO₂)
  note?: string;                   // optional contextual note (e.g. S2's counter-intuitive result)
}

/**
 * User override data — Scenario 3 only.
 * Captures the user's original manual schedule, the unexpected tariff spike
 * that triggered the AI override, and the rescheduled target window.
 */
export interface UserOverride {
  originalScheduleDescription: string;     // e.g. 'washing machine + dishwasher'
  originalWindowStart: string;             // 'HH:MM'
  originalWindowEnd: string;               // 'HH:MM'
  originalForecastRatePence: number;       // tariff the user expected to pay
  spikeWindowStart: string;               // 'HH:MM' — when the unforecast spike began
  spikeWindowEnd: string;                 // 'HH:MM'
  actualSpikeRatePence: number;           // rate during the spike
  overrideTargetStart: string;            // 'HH:MM' — rescheduled to
  overrideTargetEnd: string;              // 'HH:MM'
  overrideTargetForecastRatePence: number; // forecast rate at new target time
  overrideReason: string;                 // human-readable summary of why the override occurred
  costWithoutOverridePence: number;       // what it would have cost without the override
}

/**
 * Breakdown of how today's savings were achieved.
 * solarPence + offPeakPence must equal the parent Scenario's savingsPence.
 */
export interface SavingsBreakdown {
  solarPence: number;    // savings attributable to solar generation capture
  offPeakPence: number;  // savings attributable to off-peak grid pricing
}

// ── Main Scenario interface ──────────────────────────────────────────────────

export interface Scenario {
  // Identity
  id: '1' | '2' | '3';
  label: string;
  date: string;                         // ISO 'YYYY-MM-DD'
  weather: string;

  // Battery state
  batteryCapacityKWh: number;
  batterySOCPct: number;                // percentage at scenario reference time
  batterySOCReferenceTime: string;      // 'HH:MM' — when SOC was measured

  // AI decision
  chargeWindowStart: string;            // 'HH:MM'
  chargeWindowEnd: string;              // 'HH:MM'
  /** Populated when there is a contrast between what the user expected
   *  and what the AI scheduled (Scenarios 2 and 3). */
  userExpectedChargeTime?: string;      // 'HH:MM'

  // Tariff — actual/real rates in chronological order (includes unforecast spikes)
  tariffSchedule: TariffBand[];

  // Solar
  solarForecast: SolarForecast;

  // Carbon intensity — spot readings; each applies from its time until the next entry
  carbonIntensity: CarbonIntensityReading[];

  // Outputs (monetary values in pence; display formatting belongs in components)
  costTodayPence: number;
  savingsPence: number;
  savingsBreakdown: SavingsBreakdown;
  co2AvoidedKg: number;

  // Causal factors
  causalFactors: CausalFactors;

  // Forecast accuracy
  forecastAccuracyPct: number;          // e.g. 87
  forecastVariancePct?: number;         // ± figure, e.g. 8; omit if not specified

  // Counterfactual — consumed by Prototype D
  counterfactual: Counterfactual;

  // Optional — only Scenario 3
  userOverride?: UserOverride;
}
