import { MockScenario } from './mock-scenarios';

class MockScenarioContextStore {
  private readonly byConsultation = new Map<string, MockScenario>();

  set(consultationId: string, scenario: MockScenario) {
    this.byConsultation.set(consultationId, scenario);
  }

  get(consultationId: string): MockScenario | undefined {
    return this.byConsultation.get(consultationId);
  }

  clear(consultationId: string) {
    this.byConsultation.delete(consultationId);
  }
}

export const mockScenarioContext = new MockScenarioContextStore();
