#!/usr/bin/env node
// Wrapper to run Jest with fixed args, ignoring any extra args passed by turbo (e.g. --run)
import { execSync } from 'child_process';
try {
  execSync(
    'jest --testPathPattern="src/(lib|services)/__tests__" --passWithNoTests',
    { stdio: 'inherit', cwd: import.meta.dirname }
  );
} catch (e) {
  process.exit(e.status ?? 1);
}
