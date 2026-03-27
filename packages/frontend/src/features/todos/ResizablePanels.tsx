import { Fragment, useCallback, useMemo, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { cn } from '@/lib/utils'

/**
 * Configuration for a single panel
 */
export interface PanelConfig {
  /** Unique identifier for the panel */
  id: string
  /** Default size as percentage (0-100) */
  defaultSize: number
  /** Minimum size in pixels */
  minSize: number
  /** Additional CSS classes for the panel */
  className?: string
}

/**
 * Props for the ResizablePanels component
 */
export interface ResizablePanelsProps {
  /** Configuration for each panel */
  panelConfigs: PanelConfig[]
  /** Panel content (children) - must match panelConfigs length */
  children: React.ReactNode
  /** Additional CSS classes for the Group */
  className?: string
}

/**
 * Storage key for localStorage persistence
 */
const STORAGE_KEY = 'nanomail-todo-panels'

/**
 * Layout type: map of panel id to percentage (0-100)
 */
type Layout = Record<string, number>

/**
 * Default panel configurations for the Todo page
 * These match the design specifications from plan_2_phase_2.md
 *
 * defaultSize: Percentage values (0-100)
 * minSize: Pixel values for absolute minimum widths
 */
export const DEFAULT_PANEL_CONFIGS: PanelConfig[] = [
  { id: 'inbox', defaultSize: 25, minSize: 280 },
  { id: 'planner', defaultSize: 35, minSize: 320 },
  { id: 'board', defaultSize: 40, minSize: 280 },
]

/**
 * Load layout from localStorage
 */
function loadLayout(): Layout | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as Layout
    }
  } catch {
    // Ignore parsing errors
  }
  return null
}

/**
 * Save layout to localStorage
 */
function saveLayout(layout: Layout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Resize handle styles:
 * - w-2: 8px transparent hitbox
 * - before:w-0.5: 2px highlight line
 * - Transparent by default, shows border on hover
 */
const RESIZE_HANDLE_CLASSNAME = cn(
  'w-2 relative',
  'before:absolute before:inset-y-0 before:left-1/2 before:w-0.5',
  'before:bg-transparent hover:before:bg-border',
  'before:transition-colors cursor-col-resize'
)

/**
 * ResizablePanels - Container for resizable panels with drag handles
 *
 * Features:
 * - Horizontal layout with draggable resize handles
 * - Automatic localStorage persistence
 * - Minimum size constraints for each panel
 * - Transparent hot zone (8px) with hover highlight line (1-2px)
 *
 * @example
 * ```tsx
 * <ResizablePanels panelConfigs={DEFAULT_PANEL_CONFIGS}>
 *   <InboxPanel />
 *   <PlannerPanel />
 *   <BoardPanel />
 * </ResizablePanels>
 * ```
 */
export function ResizablePanels({
  panelConfigs,
  children,
  className,
}: ResizablePanelsProps) {
  // Normalize children to array
  const childArray = Array.isArray(children) ? children : [children]

  // Validate children count matches panel configs
  if (childArray.length !== panelConfigs.length) {
    throw new Error(
      `ResizablePanels: children count (${childArray.length}) must match panelConfigs count (${panelConfigs.length})`
    )
  }

  // Initialize layout from localStorage or use defaults
  const [savedLayout, setSavedLayout] = useState<Layout | null>(() => loadLayout())

  // Create default layout from panel configs
  const defaultLayout = useMemo((): Layout => {
    return panelConfigs.reduce((acc, config) => {
      acc[config.id] = config.defaultSize
      return acc
    }, {} as Layout)
  }, [panelConfigs])

  // Merge saved layout with defaults
  const initialLayout = savedLayout ?? defaultLayout

  // Handle layout changes and save to localStorage
  const handleLayoutChanged = useCallback((layout: Layout) => {
    setSavedLayout(layout)
    saveLayout(layout)
  }, [])

  // Single panel - no resize handles needed
  if (panelConfigs.length === 1) {
    const config = panelConfigs[0]
    return (
      <Group
        orientation="horizontal"
        className={cn('h-full', className)}
        defaultLayout={initialLayout}
        onLayoutChanged={handleLayoutChanged}
      >
        <Panel
          id={config.id}
          defaultSize={config.defaultSize}
          minSize={config.minSize}
          className={config.className}
        >
          {childArray[0]}
        </Panel>
      </Group>
    )
  }

  // Multiple panels - render with separators between them
  return (
    <Group
      orientation="horizontal"
      className={cn('h-full', className)}
      defaultLayout={initialLayout}
      onLayoutChanged={handleLayoutChanged}
    >
      {panelConfigs.map((config, index) => (
        <Fragment key={config.id}>
          <Panel
            id={config.id}
            defaultSize={config.defaultSize}
            minSize={config.minSize}
            className={config.className}
          >
            {childArray[index]}
          </Panel>

          {index < panelConfigs.length - 1 && (
            <Separator className={RESIZE_HANDLE_CLASSNAME} />
          )}
        </Fragment>
      ))}
    </Group>
  )
}