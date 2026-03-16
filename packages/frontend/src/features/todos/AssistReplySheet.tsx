import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { EmailService, type TodoItem } from '@/services'
import { DraftEditor } from './DraftEditor'
import { useUpdateTodoMutation } from '@/hooks'

export interface AssistReplySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  todo: TodoItem
}

interface EmailContext {
  subject: string | null
  sender: string | null
  snippet: string | null
}

export function AssistReplySheet({
  open,
  onOpenChange,
  todo,
}: AssistReplySheetProps) {
  const [instruction, setInstruction] = useState('')
  const [emailContext, setEmailContext] = useState<EmailContext | null>(null)
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [showDraftEditor, setShowDraftEditor] = useState(false)
  const updateMutation = useUpdateTodoMutation()

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setInstruction('')
      setShowDraftEditor(false)
    }
  }, [open])

  // Fetch email context when sheet opens
  useEffect(() => {
    if (open && todo.emailId) {
      setIsLoadingEmail(true)
      EmailService.getEmail(todo.emailId)
        .then((email) => {
          setEmailContext({
            subject: email.subject,
            sender: email.sender,
            snippet: email.snippet,
          })
        })
        .catch(() => {
          toast.error('Failed to load email context')
        })
        .finally(() => {
          setIsLoadingEmail(false)
        })
    }
  }, [open, todo.emailId])

  const handleStartDraft = useCallback(() => {
    if (instruction.trim()) {
      setShowDraftEditor(true)
    }
  }, [instruction])

  const handleCloseDraftEditor = useCallback(() => {
    setShowDraftEditor(false)
  }, [])

  const handleDraftSent = useCallback(async () => {
    // Update todo status to completed via mutation
    updateMutation.mutate({ id: todo.id, data: { status: 'completed' } })
    onOpenChange(false)
  }, [onOpenChange, updateMutation, todo.id])

  const isStartDraftDisabled = !instruction.trim()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[550px] w-[550px] overflow-y-auto" data-testid="assist-reply-sheet">
        <SheetHeader>
          <SheetTitle>Assist Reply</SheetTitle>
          <SheetDescription>
            Provide instructions for the AI to draft a reply
          </SheetDescription>
        </SheetHeader>

        {!showDraftEditor ? (
          <div className="mt-6 space-y-6">
            {/* Todo Context */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Task</Label>
              <div className="flex items-start gap-2">
                <p className="text-sm flex-1">{todo.description}</p>
                <Badge variant={todo.urgency}>{todo.urgency}</Badge>
              </div>
            </div>

            {/* Email Context */}
            <div className="space-y-2 p-3 rounded-lg bg-muted/50">
              <Label className="text-sm font-medium text-muted-foreground">Email Context</Label>
              {isLoadingEmail ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : emailContext ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium">{emailContext.subject}</p>
                  <p className="text-xs text-muted-foreground">From: {emailContext.sender}</p>
                  {emailContext.snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {emailContext.snippet}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No email context available</p>
              )}
            </div>

            {/* Instruction Input */}
            <div className="space-y-2">
              <Label htmlFor="instruction">Instructions</Label>
              <Textarea
                id="instruction"
                placeholder="Enter your instructions for the AI assistant..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Start Draft Button */}
            <Button
              onClick={handleStartDraft}
              disabled={isStartDraftDisabled}
              className="w-full"
            >
              Start Draft
            </Button>
          </div>
        ) : (
          <DraftEditor
            emailId={todo.emailId}
            instruction={instruction}
            onClose={handleCloseDraftEditor}
            onSend={handleDraftSent}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}