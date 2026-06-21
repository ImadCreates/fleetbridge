// Uses Vitest globals (configured via test.globals in vite.config.ts).
describe('smoke', () => {
  it('confirms the test runner executes', () => {
    expect(1 + 1).toBe(2)
  })
})
