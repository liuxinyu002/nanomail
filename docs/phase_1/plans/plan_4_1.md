# Phase 4.1: UI Layout & Settings Dashboard

> **Part of Phase 4: Frontend Interaction & Workspace**

## Overview

| Aspect | Details |
|--------|---------|
| **Phase Number** | 4 of 5 |
| **Task Group** | T10 (Part 1 of 4) |
| **Focus Area** | Main layout shell, navigation, settings configuration |
| **Total Tasks** | 2 subtasks |
| **Dependencies** | Phase 3 (AI Engine & Agent Core), T6 (Backend API Core) for settings persistence |
| **Estimated Effort** | 1 day |

---

## Context

The base layout and the crucial configuration screen to enter keys. This is the first thing users see and must be intuitive. The UI should follow a clean, minimalist "Vibe" aesthetic using Shadcn and Tailwind.

---

## T10.1: Main Layout Shell

### Description
Create the main layout shell with compact sidebar navigation (Inbox, To-Do, Settings).

### Implementation Notes

```tsx
// Layout structure with compact sidebar
const MainLayout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Compact Sidebar - collapsed by default, hover to expand */}
      <aside
        className={cn(
          'transition-all duration-300 ease-in-out border-r border-border/50',
          sidebarExpanded ? 'w-56' : 'w-16'
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="p-4">
          <h1 className={cn(
            'text-xl font-bold transition-opacity',
            sidebarExpanded ? 'opacity-100' : 'opacity-0'
          )}>
            NanoMail
          </h1>
          {!sidebarExpanded && (
            <span className="text-lg font-bold">NM</span>
          )}
        </div>
        <nav className="p-4 space-y-2">
          <NavItem icon={<Inbox />} label="Inbox" path="/inbox" expanded={sidebarExpanded} />
          <NavItem icon={<CheckSquare />} label="To-Do" path="/todos" expanded={sidebarExpanded} />
          <NavItem icon={<Settings />} label="Settings" path="/settings" expanded={sidebarExpanded} />
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

### UI Requirements
- Compact sidebar (w-16 collapsed, w-56 expanded on hover)
- Minimal border styling (border-border/50)
- Active route indication
- Clean typography and spacing
- Dark mode support (via Tailwind/Shadcn)
- Icon-only mode when collapsed, full labels on hover

### Deliverables
- [ ] Main layout component with compact sidebar
- [ ] Navigation items with icons and expand/collapse animation
- [ ] React Router setup
- [ ] Responsive design with hover expansion

---

## T10.2: Settings Form with Tabs

### Description
Build the Settings form allowing the user to input and save IMAP, SMTP, and LLM API keys. Use Tabs to organize configuration into logical sections.

### Implementation Notes

```tsx
interface SettingsForm {
  // IMAP
  imapHost: string
  imapPort: string
  imapUser: string
  imapPassword: string

  // SMTP
  smtpHost: string
  smtpPort: string
  smtpUser: string
  smtpPassword: string

  // LLM
  llmProvider: 'openai' | 'deepseek' | 'ollama'
  llmApiKey: string
  llmModel: string
  llmBaseUrl?: string
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingsForm>(defaultSettings)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.saveSettings(settings)
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
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
              {/* IMAP fields */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>Outgoing mail server settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SMTP fields */}
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
              {/* LLM fields */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          Save Settings
        </Button>
      </div>
    </div>
  )
}
```

### UI Requirements
- Use Shadcn `<Tabs>` component to split configuration
- Tab 1: "Email Servers" (IMAP + SMTP cards)
- Tab 2: "AI Engine" (LLM configuration)
- Page should fit within standard desktop height without scrolling for single configuration
- Clean, organized layout with proper spacing

### Security Considerations
- Mask password fields
- Show connection test buttons
- Validate required fields before save
- Handle encrypted storage transparently

### Deliverables
- [ ] Settings form with Tabs component
- [ ] Email Servers tab with IMAP and SMTP cards
- [ ] AI Engine tab with LLM configuration
- [ ] Save functionality with API integration
- [ ] Connection test buttons (optional)

---

## Completion Checklist

### T10.1: Main Layout Shell
- [ ] Compact sidebar (w-16 collapsed, w-56 expanded on hover)
- [ ] Minimal border styling (border-border/50)
- [ ] Navigation items with icons and expand/collapse animation
- [ ] React Router setup
- [ ] Responsive design with hover expansion

### T10.2: Settings Form
- [ ] Tabs component for Email Servers / AI Engine
- [ ] IMAP configuration card
- [ ] SMTP configuration card
- [ ] LLM configuration with provider selection
- [ ] Save functionality with API integration

---

## Dependencies for Next Phase

This phase must be completed before:
- **Phase 4.2 (T11)**: Vibe Inbox & AI Trigger requires the main layout shell

---

## Next Phase

→ [Phase 4.2: Vibe Inbox & AI Trigger](./plan_4_2.md)