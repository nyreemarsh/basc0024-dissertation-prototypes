import { useSearchParams } from 'react-router-dom'
import { PrototypeA } from './prototypes/PrototypeA'
import { PrototypeB } from './prototypes/PrototypeB'
import { PrototypeC } from './prototypes/PrototypeC'
import { PrototypeD } from './prototypes/PrototypeD'
import { ScenarioProvider } from './context/ScenarioContext'
import { getScenario } from './scenarios'
import { SessionLauncher } from './SessionLauncher'

const VALID_PROTOTYPES = ['A', 'B', 'C', 'D'] as const
const VALID_SCENARIOS = ['1', '2', '3'] as const

type ValidPrototype = typeof VALID_PROTOTYPES[number]
type ValidScenario = typeof VALID_SCENARIOS[number]

function isValidPrototype(p: string | null): p is ValidPrototype {
  return p !== null && (VALID_PROTOTYPES as readonly string[]).includes(p)
}

function isValidScenario(s: string | null): s is ValidScenario {
  return s !== null && (VALID_SCENARIOS as readonly string[]).includes(s)
}

const PROTOTYPE_MAP: Record<ValidPrototype, React.ComponentType> = {
  A: PrototypeA,
  B: PrototypeB,
  C: PrototypeC,
  D: PrototypeD,
}

function App() {
  const [searchParams] = useSearchParams()
  const prototypeParam = searchParams.get('prototype')
  const scenarioParam = searchParams.get('scenario')
  const pidParam = searchParams.get('pid')

  if (!isValidPrototype(prototypeParam) || !isValidScenario(scenarioParam)) {
    return <SessionLauncher />
  }

  const PrototypeComponent = PROTOTYPE_MAP[prototypeParam]
  const scenarioData = getScenario(scenarioParam)

  return (
    <>
      <ScenarioProvider scenario={scenarioData}>
        <PrototypeComponent />
      </ScenarioProvider>

      {/* Discreet session indicator — for researcher reference only */}
      <div
        style={{
          position: 'fixed',
          bottom: 8,
          left: 8,
          fontSize: 10,
          fontFamily: 'monospace',
          color: '#94A3B8',
          opacity: 0.6,
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 9999,
        }}
      >
        {pidParam
          ? `PID: ${pidParam} · Prototype ${prototypeParam} · Scenario ${scenarioParam}`
          : `⚠ No PID · Prototype ${prototypeParam} · Scenario ${scenarioParam}`}
      </div>
    </>
  )
}

export default App
