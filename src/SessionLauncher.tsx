import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scenario1, scenario2, scenario3 } from './scenarios'

const PROTOTYPES = [
  { value: 'A', label: 'A — Interpretable' },
  { value: 'B', label: 'B — Comprehensible' },
  { value: 'C', label: 'C — Uncertainty-integrated' },
  { value: 'D', label: 'D — Truly explainable' },
] as const

const SCENARIOS = [
  { value: '1', label: `1 — ${scenario1.label}` },
  { value: '2', label: `2 — ${scenario2.label}` },
  { value: '3', label: `3 — ${scenario3.label}` },
] as const

export function SessionLauncher() {
  const navigate = useNavigate()
  const [pid, setPid] = useState('')
  const [prototype, setPrototype] = useState('')
  const [scenario, setScenario] = useState('')

  const canStart = pid.trim() !== '' && prototype !== '' && scenario !== ''

  function handleStart() {
    if (!canStart) return
    navigate(
      `/?prototype=${prototype}&scenario=${scenario}&pid=${encodeURIComponent(pid.trim())}`
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 space-y-7">

        {/* Header */}
        <div>
          <span className="inline-block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase mb-2">
            Researcher tool
          </span>
          <h1 className="text-xl font-bold text-slate-800 leading-tight">
            EnergyView Evaluation
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Configure the session below, then press <strong className="text-slate-600">Start session</strong>.
            The participant will see the prototype immediately — hand over the device only after pressing start.
          </p>
        </div>

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Participant ID */}
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
            value={pid}
            onChange={(e) => setPid(e.target.value)}
            placeholder="e.g. P01"
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>

        {/* Prototype selector */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Prototype</p>
          <div className="space-y-2">
            {PROTOTYPES.map((p) => (
              <label
                key={p.value}
                className="flex items-center gap-3 cursor-pointer group rounded-lg px-3 py-2 hover:bg-slate-50 transition"
              >
                <input
                  type="radio"
                  name="prototype"
                  value={p.value}
                  checked={prototype === p.value}
                  onChange={() => setPrototype(p.value)}
                  className="w-4 h-4 accent-blue-600 shrink-0"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">
                  {p.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Scenario selector */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Scenario</p>
          <div className="space-y-2">
            {SCENARIOS.map((s) => (
              <label
                key={s.value}
                className="flex items-center gap-3 cursor-pointer group rounded-lg px-3 py-2 hover:bg-slate-50 transition"
              >
                <input
                  type="radio"
                  name="scenario"
                  value={s.value}
                  checked={scenario === s.value}
                  onChange={() => setScenario(s.value)}
                  className="w-4 h-4 accent-blue-600 shrink-0"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">
                  {s.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Start session
        </button>

      </div>
    </div>
  )
}
