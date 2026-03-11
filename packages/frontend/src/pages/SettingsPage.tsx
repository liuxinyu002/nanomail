import { useState, useEffect, type ChangeEvent } from 'react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'

interface SettingsForm {
  // IMAP
  IMAP_HOST: string
  IMAP_PORT: string
  IMAP_USER: string
  IMAP_PASS: string

  // SMTP
  SMTP_HOST: string
  SMTP_PORT: string
  SMTP_USER: string
  SMTP_PASS: string

  // LLM
  LLM_API_KEY: string
  LLM_MODEL: string
  LLM_BASE_URL: string
}

const defaultSettings: SettingsForm = {
  IMAP_HOST: '',
  IMAP_PORT: '',
  IMAP_USER: '',
  IMAP_PASS: '',
  SMTP_HOST: '',
  SMTP_PORT: '',
  SMTP_USER: '',
  SMTP_PASS: '',
  LLM_API_KEY: '',
  LLM_MODEL: '',
  LLM_BASE_URL: '',
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsForm>(defaultSettings)
  const [saving, setSaving] = useState(false)

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          setSettings(prev => ({ ...prev, ...data }))
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        // Could show a toast notification here
        console.log('Settings saved successfully')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: keyof SettingsForm, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleChange = (key: keyof SettingsForm) => (e: ChangeEvent<HTMLInputElement>) => {
    updateSetting(key, e.target.value)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email Servers</TabsTrigger>
          <TabsTrigger value="ai">AI Engine</TabsTrigger>
        </TabsList>

        {/* Email Servers Tab */}
        <TabsContent value="email" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>IMAP Configuration</CardTitle>
              <CardDescription>Incoming mail server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="imap-host">IMAP Host</Label>
                <Input
                  id="imap-host"
                  placeholder="imap.example.com"
                  value={settings.IMAP_HOST}
                  onChange={handleChange('IMAP_HOST')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imap-port">IMAP Port</Label>
                <Input
                  id="imap-port"
                  placeholder="993"
                  value={settings.IMAP_PORT}
                  onChange={handleChange('IMAP_PORT')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imap-user">IMAP User</Label>
                <Input
                  id="imap-user"
                  placeholder="user@example.com"
                  value={settings.IMAP_USER}
                  onChange={handleChange('IMAP_USER')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imap-password">IMAP Password</Label>
                <Input
                  id="imap-password"
                  type="password"
                  placeholder="••••••••"
                  value={settings.IMAP_PASS}
                  onChange={handleChange('IMAP_PASS')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>Outgoing mail server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.example.com"
                  value={settings.SMTP_HOST}
                  onChange={handleChange('SMTP_HOST')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  id="smtp-port"
                  placeholder="587"
                  value={settings.SMTP_PORT}
                  onChange={handleChange('SMTP_PORT')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-user">SMTP User</Label>
                <Input
                  id="smtp-user"
                  placeholder="user@example.com"
                  value={settings.SMTP_USER}
                  onChange={handleChange('SMTP_USER')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">SMTP Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  placeholder="••••••••"
                  value={settings.SMTP_PASS}
                  onChange={handleChange('SMTP_PASS')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Engine Tab */}
        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>LLM Configuration</CardTitle>
              <CardDescription>AI model settings for email processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="llm-provider">LLM Provider</Label>
                <Input
                  id="llm-provider"
                  placeholder="openai"
                  value="openai"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                  value={settings.LLM_API_KEY}
                  onChange={handleChange('LLM_API_KEY')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="gpt-4"
                  value={settings.LLM_MODEL}
                  onChange={handleChange('LLM_MODEL')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL (Optional)</Label>
                <Input
                  id="base-url"
                  placeholder="https://api.openai.com/v1"
                  value={settings.LLM_BASE_URL}
                  onChange={handleChange('LLM_BASE_URL')}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}