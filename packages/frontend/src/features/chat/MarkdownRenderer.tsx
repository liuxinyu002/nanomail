import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  onTodoToggle?: (todoId: string, checked: boolean) => void
  todoIds?: Set<string>  // IDs of todos in TodoCardWidget for deduplication
  isCompact?: boolean
}

/**
 * Component Property Filtering Strategy:
 *
 * Instead of regex-based text preprocessing, we use react-markdown's `components`
 * prop to intercept rendered elements. This works on the parsed AST, not raw text.
 *
 * Why this is better than regex:
 * 1. Handles nested lists correctly (regex would break)
 * 2. Handles escaped characters and code blocks properly
 * 3. More maintainable - we work with structured data, not string manipulation
 * 4. react-markdown already parses the AST; we just filter at render time
 */
export function MarkdownRenderer({ content, onTodoToggle, todoIds, isCompact }: MarkdownRendererProps) {
  // Determine if a task list item should be filtered out
  const shouldSkipTaskItem = (textContent: string): boolean => {
    if (!todoIds || todoIds.size === 0) return false
    // Check if any todo ID appears in the text
    for (const id of todoIds) {
      if (textContent.includes(id)) return true
    }
    // If we have todoIds but can't match by ID, skip all task items when widget is present
    return true
  }

  const components: Components = {
    // Open links in new tab with XSS protection
    a: ({ href, children }) => {
      // Prevent javascript: URLs (XSS protection)
      const isSafeUrl = href && !href.toLowerCase().startsWith('javascript:')
      return (
        <a
          href={isSafeUrl ? href : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {children}
        </a>
      )
    },
    // Intercept list items to filter task list duplicates via Component Property Filtering
    li: ({ children, className, ...props }) => {
      // Check if this is a task list item (remark-gfm adds this class)
      const isTaskItem = className?.includes('task-list-item')

      if (isTaskItem && todoIds && todoIds.size > 0) {
        const textContent = extractTextContent(children)
        if (shouldSkipTaskItem(textContent)) {
          return null // Skip rendering this list item entirely
        }
      }
      return (
        <li className={className} {...props}>
          {children}
        </li>
      )
    },
    // Render remaining checkboxes (if any) as interactive
    input: ({ type, checked, disabled, ...props }) => {
      if (type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled={false} // Always enable for interactivity
            onChange={(e) => {
              const siblingText = (e.target.parentElement?.textContent || '').trim()
              onTodoToggle?.(siblingText, e.target.checked)
            }}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            {...props}
          />
        )
      }
      return <input type={type} checked={checked} disabled={disabled} {...props} />
    },
  }
  return (
    <div className={cn(
      isCompact ? "prose prose-sm max-w-none text-sm" : "prose prose-sm max-w-none",
      // Compact mode: reduce vertical margins for higher information density
      isCompact && [
        "[&_p]:my-1",
        "[&_ul]:my-1",
        "[&_ol]:my-1",
        "[&_li]:my-0.5",
        "[&_h1]:my-2",
        "[&_h2]:my-2",
        "[&_h3]:my-1.5",
        "[&_pre]:my-1.5",
        "[&_blockquote]:my-1.5",
      ]
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
/**
 * Recursively extract text content from React children.
 * Used for Component Property Filtering to match task items against todoIds.
 */
function extractTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (!children) return ''
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join('')
  }
  if (typeof children === 'object' && 'props' in children) {
    const props = (children as { props?: { children?: React.ReactNode } }).props
    if (props?.children) {
      return extractTextContent(props.children)
    }
  }
  return ''
}
