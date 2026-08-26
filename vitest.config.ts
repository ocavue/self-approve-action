import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['json-summary', 'text', 'lcov'],
      reportsDirectory: './coverage'
    }
  }
})
