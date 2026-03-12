import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useScenariosStore } from '@/store/useScenariosStore'
import { ScenarioCard } from './ScenarioCard'
import { ScenarioResults } from './ScenarioResults'

export function Step2Scenarios() {
  const scenarios = useScenariosStore((s) => s.scenarios)
  const addScenario = useScenariosStore((s) => s.addScenario)

  const firstScenarioId = scenarios[0]?.id ?? ''

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Step 2: Define Target Scenarios</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure one or more target server specs and sizing assumptions.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addScenario}
          aria-label="Add Scenario"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Scenario
        </Button>
      </div>

      <Tabs defaultValue={firstScenarioId} key={firstScenarioId}>
        <TabsList className="flex-wrap h-auto gap-1">
          {scenarios.map((scenario) => (
            <TabsTrigger key={scenario.id} value={scenario.id} className="text-sm">
              {scenario.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {scenarios.map((scenario) => (
          <TabsContent key={scenario.id} value={scenario.id}>
            {/* key=scenario.id forces fresh useForm init on duplicate (SCEN-05) */}
            <ScenarioCard key={scenario.id} scenarioId={scenario.id} />
            <ScenarioResults scenarioId={scenario.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
