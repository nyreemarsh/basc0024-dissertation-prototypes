import { scenario1 } from './scenario1';
import { scenario2 } from './scenario2';
import { scenario3 } from './scenario3';
import type { Scenario } from './types';

export { scenario1, scenario2, scenario3 };

export type {
  Scenario,
  ConfidenceQualifier,
  FactorWeight,
  TariffBand,
  CarbonIntensityReading,
  SolarForecast,
  CausalFactors,
  Counterfactual,
  UserOverride,
} from './types';

const scenarioMap: Record<'1' | '2' | '3', Scenario> = {
  '1': scenario1,
  '2': scenario2,
  '3': scenario3,
};

/**
 * Returns the canonical Scenario fixture for the given id.
 * Intended for use by the session launcher and ScenarioContext provider.
 */
export function getScenario(id: '1' | '2' | '3'): Scenario {
  return scenarioMap[id];
}
