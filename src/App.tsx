import { PrototypeA } from './prototypes/PrototypeA'
import { PrototypeB } from './prototypes/PrototypeB'
import { PrototypeC } from './prototypes/PrototypeC'
import { PrototypeD } from './prototypes/PrototypeD'
import { ScenarioProvider } from './context/ScenarioContext'
import { scenario1, scenario2, scenario3 } from './scenarios'

function App() {
  return (
    <ScenarioProvider scenario={scenario3}>
      <PrototypeC />
    </ScenarioProvider>
  )
}

export default App