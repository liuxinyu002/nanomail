import { describe, it, expect } from 'vitest'

describe('pages/index.ts exports', () => {
  it('should export SettingsPage', async () => {
    const { SettingsPage } = await import('./index')
    expect(SettingsPage).toBeDefined()
  })

  it('should export ChatPage', async () => {
    const { ChatPage } = await import('./index')
    expect(ChatPage).toBeDefined()
  })
})
