import { defineConfig, devices } from '@playwright/test'
import config from './playwright.config'
export default defineConfig({
  ...config,
  metadata: { offlineDemo: true },
  testMatch: '**/async-state.spec.ts',
  grep: /demo:/,
  workers: 1,
  outputDir: 'artifacts/offline-demo',
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1100, height: 1000 },
        video: { mode: 'on', size: { width: 1100, height: 1000 } },
      },
    },
  ],
})
