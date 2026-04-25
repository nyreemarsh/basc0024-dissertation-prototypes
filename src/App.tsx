import { useSearchParams, useNavigate } from 'react-router-dom'
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

// ── Shared overlay styles ────────────────────────────────────────────────────

const overlayPill: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.92)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  padding: '5px 10px',
  fontSize: 11,
  fontFamily: "'DM Sans', system-ui, sans-serif",
  color: '#475569',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  lineHeight: 1.4,
  userSelect: 'none',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

const overlayButton: React.CSSProperties = {
  ...overlayPill,
  fontWeight: 600,
  color: '#1E40AF',
  border: '1px solid #BFDBFE',
  background: 'rgba(239, 246, 255, 0.95)',
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const prototypeParam = searchParams.get('prototype')
  const scenarioParam = searchParams.get('scenario')
  const pidParam = searchParams.get('pid') ?? ''
  const completedParam = searchParams.get('completed') ?? ''

  // Show launcher whenever prototype or scenario is absent/invalid
  if (!isValidPrototype(prototypeParam) || !isValidScenario(scenarioParam)) {
    return <SessionLauncher />
  }

  const PrototypeComponent = PROTOTYPE_MAP[prototypeParam]
  const scenarioData = getScenario(scenarioParam)
  const scenarioNum = parseInt(scenarioParam, 10)

  // ── Navigation helpers ─────────────────────────────────────────────────────

  function backToLauncher() {
    const base = `/?pid=${encodeURIComponent(pidParam)}`
    navigate(completedParam ? `${base}&completed=${completedParam}` : base)
  }

  function goNextScenario() {
    navigate(
      `/?prototype=${prototypeParam}&scenario=${scenarioNum + 1}&pid=${encodeURIComponent(pidParam)}&completed=${completedParam}`
    )
  }

  function finishPrototype() {
    const existing = completedParam.split(',').filter(Boolean)
    const updated = [...new Set([...existing, prototypeParam])].join(',')
    const base = `/?pid=${encodeURIComponent(pidParam)}`
    navigate(updated ? `${base}&completed=${updated}` : base)
  }

  return (
    <>
      {/* key forces full remount on scenario change so TemporalNav's
          useState(todayIndex) re-fires with the new scenario's day */}
      <ScenarioProvider key={`${prototypeParam}-${scenarioParam}`} scenario={scenarioData}>
        <PrototypeComponent />
      </ScenarioProvider>

      {/* ── Back to launcher — fixed top-left ─────────────────────────────── */}
      <div
        style={{ position: 'fixed', top: 10, left: 10, zIndex: 9999 }}
      >
        <button
          onClick={backToLauncher}
          style={overlayPill}
          title="Return to launcher without marking this prototype complete"
        >
          ← Back to launcher
        </button>
      </div>

      {/* ── Scenario navigation — fixed bottom-right ──────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 8,
          right: 8,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ ...overlayPill, cursor: 'default', color: '#64748B' }}>
          Scenario {scenarioNum} of 3
        </span>

        {scenarioNum < 3 ? (
          <button onClick={goNextScenario} style={overlayButton}>
            Next scenario →
          </button>
        ) : (
          <button onClick={finishPrototype} style={overlayButton}>
            Finish prototype →
          </button>
        )}
      </div>

      {/* ── Session indicator — fixed bottom-left (researcher reference) ─── */}
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
