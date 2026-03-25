import { describe, it, expect } from 'vitest';

// agent-modes-data exports mode configuration
import * as agentModesData from './agent-modes-data';

describe('agent-modes-data', () => {
  it('exports module', () => {
    expect(agentModesData).toBeDefined();
  });
});
