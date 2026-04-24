import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type { Scenario } from '../scenarios/types';

const ScenarioContext = createContext<Scenario | null>(null);

interface ScenarioProviderProps {
  scenario: Scenario;
  children: ReactNode;
}

export function ScenarioProvider({ scenario, children }: ScenarioProviderProps) {
  return (
    <ScenarioContext.Provider value={scenario}>
      {children}
    </ScenarioContext.Provider>
  );
}

/**
 * Returns the current Scenario from context.
 * Must be used inside a <ScenarioProvider>. Throws a descriptive error
 * if called outside one, to catch misconfigured prototype/session setups early.
 */
export function useScenario(): Scenario {
  const scenario = useContext(ScenarioContext);
  if (scenario === null) {
    throw new Error(
      'useScenario() was called outside a <ScenarioProvider>. ' +
      'Wrap the prototype component tree in <ScenarioProvider scenario={...}>.'
    );
  }
  return scenario;
}
