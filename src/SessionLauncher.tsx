import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getPrototypeOrder } from './scenarios/latinSquare'

// ── URL helpers ───────────────────────────────────────────────────────────────

function prototypeUrl(
  proto: string,
  scenario: string,
  pid: string,
  completed: string
): string {
  return `/?prototype=${proto}&scenario=${scenario}&pid=${encodeURIComponent(pid)}&completed=${completed}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SessionLauncher() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const pidParam = searchParams.get('pid') ?? ''
  const completedParam = searchParams.get('completed') ?? ''

  // Determine which state to render based on URL pid validity
  const validatedOrder = getPrototypeOrder(pidParam)

  // ── State 1: PID entry ──────────────────────────────────────────────────────
  const [pidInput, setPidInput] = useState('')
  const [pidError, setPidError] = useState('')

  function handleSubmit() {
    const trimmed = pidInput.trim()
    const order = getPrototypeOrder(trimmed)
    if (!order) {
      setPidError('Invalid participant ID. Format must be P1 through P12.')
      return
    }
    setPidError('')
    navigate(`/?pid=${encodeURIComponent(trimmed)}`)
  }

  if (!validatedOrder) {
    // ── State 1 render ────────────────────────────────────────────────────────
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 space-y-6">

          {/* Header */}
          <div>
            <span className="inline-block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
              Researcher tool
            </span>
            <h1 className="text-xl font-bold text-slate-800 leading-tight">
              EnergyView Evaluation
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Enter the participant ID to load their prototype order.
            </p>
          </div>

          <hr className="border-slate-200" />

          {/* PID input */}
          <div className="space-y-1.5">
            <label
              className="block text-sm font-semibold text-slate-700"
              htmlFor="pid-input"
            >
              Participant ID
            </label>
            <input
              id="pid-input"
              type="text"
              value={pidInput}
              onChange={(e) => {
                setPidInput(e.target.value)
                if (pidError) setPidError('')
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. P1"
              autoComplete="off"
              autoFocus
              className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                pidError ? 'border-red-400 bg-red-50' : 'border-slate-300'
              }`}
            />
            {pidError && (
              <p className="text-xs text-red-500 mt-1">{pidError}</p>
            )}
            <p className="text-xs text-slate-400">
              Accepts P1 through P12 only.
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99]"
          >
            Start session
          </button>

        </div>
      </div>
    )
  }

  // ── State 2: Prototype card selector ───────────────────────────────────────

  const completedSet = new Set(completedParam.split(',').filter(Boolean))
  const allDone = completedSet.size === 4

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8 space-y-6">

        {/* Header */}
        <div>
          <span className="inline-block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
            Researcher tool
          </span>
          <h1 className="text-xl font-bold text-slate-800 leading-tight">
            EnergyView Evaluation
          </h1>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-slate-600">
              Participant:{' '}
              <span className="font-semibold text-slate-800">{pidParam}</span>
            </p>
            <button
              onClick={() => navigate('/')}
              className="text-xs text-slate-400 hover:text-slate-600 transition underline-offset-2 hover:underline"
            >
              ← Change participant
            </button>
          </div>
        </div>

        <hr className="border-slate-200" />

        {/* Progress summary */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {completedSet.size === 0
              ? 'No prototypes completed yet'
              : `${completedSet.size} of 4 prototypes completed`}
          </span>
          {allDone && (
            <span className="text-green-600 font-semibold">
              ✓ Session complete
            </span>
          )}
        </div>

        {/* Prototype cards */}
        <div className="space-y-3">
          {([0, 1, 2, 3] as const).map((i) => {
            const protoLetter = validatedOrder[i]
            const isCompleted = completedSet.has(protoLetter)

            return (
              <button
                key={i}
                onClick={() =>
                  navigate(
                    prototypeUrl(protoLetter, '1', pidParam, completedParam)
                  )
                }
                className={`w-full flex items-center justify-between rounded-xl border px-5 py-4 text-left transition ${
                  isCompleted
                    ? 'border-green-200 bg-green-50 hover:bg-green-100'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isCompleted ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 text-xs font-bold shrink-0">
                      ✓
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-500 text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                  )}
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isCompleted ? 'text-green-700' : 'text-slate-800'
                      }`}
                    >
                      Prototype {i + 1}
                    </p>
                    {isCompleted && (
                      <p className="text-xs text-green-500 mt-0.5">
                        Completed — click to re-run
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`text-sm ${
                    isCompleted ? 'text-green-400' : 'text-slate-300'
                  }`}
                >
                  →
                </span>
              </button>
            )
          })}
        </div>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          Each prototype launches at Scenario 1. Use the in-app controls to
          advance through scenarios.
        </p>

      </div>
    </div>
  )
}
