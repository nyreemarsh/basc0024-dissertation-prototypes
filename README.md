# EnergyView Evaluation — Prototype Study App

A set of four interactive interface prototypes exploring how design can make autonomous AI energy decisions legible to non-technical users. Built as the research artefact for an undergraduate dissertation at University College London (BASC0024, May 2026).

## About the dissertation

> **Designing for AI Legibility: A Research through Design Study of Explainability Interface Prototypes for Autonomous Domestic Energy Systems**
>
> Author: Nyree Marsh
> Supervisor: Prof. Enrico Costanza
> Department: UCL Interaction Centre (UCLIC) / BASc Arts and Sciences
> Submission: May 2026

The dissertation investigates the question:

> *Given that an AI system is autonomously making domestic energy decisions, what interface designs best support a non-technical user's ability to understand, trust, and exercise appropriate agency over those decisions?*

This repository contains the prototype application used in the scenario-based evaluation reported in Chapter 6 of the dissertation. It is part of the research artefact, not a standalone product.

## What's in here

Four React prototypes, each operationalising a successive level of Doran et al.'s (2017) explainability taxonomy. The cumulative spectrum holds the visual foundation, chart type, temporal navigation and layout constant across all four — explanatory depth is the only variable.

| Prototype | Level | Adds vs. previous |
| --- | --- | --- |
| **A** | Interpretable / Baseline (DR7) | AI decisions presented as legible timestamped facts. No causal information. |
| **B** | Comprehensible (DR8) | + Named causal factors driving each decision. |
| **C** | Comprehensible+ / Uncertainty-Integrated (DR9) | + Visually encoded forecast uncertainty and confidence qualifiers. |
| **D** | Truly Explainable (DR10) | + Contrastive reasoning (selected vs. counterfactual, with what-if exploration). |

A `SessionLauncher` (researcher tool) handles participant ID validation and counterbalances prototype order across participants using a 4×4 cyclic Latin square (P1–P12).

## Running locally

Requires Node 18+ and npm.

```bash
git clone https://github.com/nyreemarsh/basc0024-dissertation-prototypes.git
cd basc0024-dissertation-prototypes
npm install
npm run dev
```

The app is then served at [http://localhost:5173](http://localhost:5173).

To produce a production build:

```bash
npm run build
npm run preview
```

## Live deployment

The prototypes are also deployed at **[https://basc0024-dissertation-prototypes.vercel.app](https://basc0024-dissertation-prototypes.vercel.app)** — open this URL to interact with the prototypes without cloning the repository.

## URL parameter scheme

The app is single-page with all session state encoded in URL parameters, so any session is fully reproducible from a URL.

| Parameter | Values | Purpose |
| --- | --- | --- |
| `pid` | `P1`–`P12` | Participant ID. Maps to a counterbalanced prototype order (`scenarios/latinSquare.ts`). |
| `prototype` | `A` \| `B` \| `C` \| `D` | Which prototype to render. |
| `scenario` | `1` \| `2` \| `3` | Which scenario fixture to load. |
| `completed` | comma-separated subset of `A,B,C,D` | Prototypes the participant has already finished. |

A URL like

```
/?prototype=B&scenario=2&pid=P5&completed=A
```

renders Prototype B at Scenario 2 for participant P5, who has already completed Prototype A. If `prototype` or `scenario` is missing or invalid, the `SessionLauncher` is shown instead.

## Project structure

```
src/
├── App.tsx                          route resolver + persistent overlays
├── SessionLauncher.tsx              researcher tool: PID entry + prototype selector
├── main.tsx                         React entry point
│
├── context/
│   └── ScenarioContext.tsx          provides current scenario to all prototypes
│
├── prototypes/
│   ├── PrototypeA.tsx               baseline (DR7)
│   ├── PrototypeB.tsx               + causal factors (DR8)
│   ├── PrototypeC.tsx               + uncertainty representation (DR9)
│   ├── PrototypeD.tsx               + contrastive reasoning (DR10)
│   ├── tokens.ts                    design tokens (colours, type, spacing)
│   └── components/
│       ├── shared/                  Header, SummaryCard, TemporalNav, Shell, Chart
│       └── additive/                exploratory variants from earlier iterations
│
├── scenarios/
│   ├── scenario1.ts                 routine off-peak charge
│   ├── scenario2.ts                 high-solar afternoon scheduling
│   ├── scenario3.ts                 counter-intuitive override of user preferences
│   ├── derivations.ts               computed values from scenario inputs
│   ├── latinSquare.ts               P1–P12 → counterbalanced prototype order
│   ├── types.ts                     Scenario / CausalFactors / TariffBand types
│   └── index.ts                     scenario lookup
│
└── styles/                          fonts and theme variables
```

The information architecture and user/task flow diagrams for this app are reproduced in Appendix 1 of the dissertation.

## Scenario fixtures

Each scenario fixture in `src/scenarios/` contains the full set of inputs the AI is "deciding from": battery state of charge, hourly solar generation, hourly consumption, tariff schedule, hourly carbon intensity, weather, and a counterfactual decision the AI evaluated but rejected. Values are grounded in published UK domestic energy market data; sources are documented in the dissertation appendix.

The three scenarios are deliberately ordered by reasoning complexity, from a routine off-peak charge (S1) to a counter-intuitive AI override of user preferences (S3), so that comprehension can be tested across varying levels of causal difficulty (Rosson and Carroll, 2002).

## Tech stack

- **React 19** + **TypeScript** for the application
- **Vite** for the dev server and build
- **React Router v7** for URL-encoded session state
- **Tailwind CSS** for `SessionLauncher` styling
- **Inline styles + design tokens** for prototype components, to keep prototype-specific styling self-contained and inspection-friendly
- **D3** is included for chart utilities; production charts are bespoke SVG to give finer control over annotation layers (see Section 3.3 of the dissertation for the methodological justification)
- **Vercel** for deployment

## Authorship and AI assistance

All design decisions, prototype concepts, scenario construction, dissertation writing, and final code were authored by the candidate. Code scaffolding (TypeScript types, repetitive component structure, build configuration) was assisted by Anthropic's Claude under the candidate's direction and review. This use is consistent with UCL's policy on the use of generative AI in coursework: AI was used as an assistive tool, not an authorial substitute, and all outputs were reviewed and edited by the candidate.

## Licence

Source code is released under the **MIT Licence**. See [`LICENSE`](./LICENSE).
Design assets (figures, prototype screenshots) are released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Citation

If you reference this work, please cite the accompanying dissertation:

> Marsh, N. (2026). *Designing for AI Legibility: A Research through Design Study of Explainability Interface Prototypes for Autonomous Domestic Energy Systems* [Undergraduate dissertation, University College London].

A persistent DOI for this codebase is archived on Zenodo: **[DOI to be added on first release]**.

---

For questions or issues, please open a GitHub issue.
