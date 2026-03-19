/**
 * ComposeEmailModal Component
 *
 * Main compose email modal with:
 * - EmailChipInput for recipients (To/Cc/Bcc)
 * - TipTapEditor for email body
 * - Data loss prevention with AlertDialog
 * - Loading states during send
 */

import { useState, useCallback, useEffect } from 'react'
import { Loader2, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

import { EmailChipInput } from './EmailChipInput'
import { TipTapEditor } from './TipTapEditor'
import { useSettings } from '@/hooks/useSettings'
import { EmailService } from '@/services/email.service'

interface ComposeEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Auto-fill To field with sender email */
  sender?: string
}

export function ComposeEmailModal({
  open,
  onOpenChange,
  sender,
}: ComposeEmailModalProps) {
  const { data: settings } = useSettings()

  // Form state
  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [isCcExpanded, setIsCcExpanded] = useState(false)
  const [isBccExpanded, setIsBccExpanded] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isBodyEmpty, setIsBodyEmpty] = useState(true)
  const [sending, setSending] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Determine if Cc/Bcc fields should be shown
  const showCcField = isCcExpanded || cc.length > 0
  const showBccField = isBccExpanded || bcc.length > 0

  // Check if form has unsaved content
  const hasContent = useCallback((): boolean => {
    return (
      to.length > 0 ||
      cc.length > 0 ||
      bcc.length > 0 ||
      subject.trim().length > 0 ||
      !isBodyEmpty
    )
  }, [to, cc, bcc, subject, isBodyEmpty])

  // Form validation
  const isValid = to.length >= 1 && subject.length >= 1 && !isBodyEmpty

  // Reset form state
  const resetForm = useCallback(() => {
    setTo([])
    setCc([])
    setBcc([])
    setSubject('')
    setBody('')
    setIsBodyEmpty(true)
    setIsCcExpanded(false)
    setIsBccExpanded(false)
  }, [])

  // Auto-fill To field with sender
  useEffect(() => {
    if (sender) {
      setTo([sender])
    }
  }, [sender])

  // Handle modal open/close with data loss prevention
  const handleOpenChange = (newOpen: boolean) => {
    // Block closure during API request
    if (!newOpen && sending) {
      return
    }

    if (!newOpen && hasContent()) {
      setShowConfirmDialog(true)
    } else {
      onOpenChange(newOpen)
    }
  }

  // Handle cancel button click
  const handleCancel = () => {
    if (sending) return
    if (hasContent()) {
      setShowConfirmDialog(true)
    } else {
      onOpenChange(false)
    }
  }

  // Handle send email
  const handleSend = async () => {
    if (!isValid || sending) return

    setSending(true)
    try {
      await EmailService.sendEmail({
        to,
        cc,
        bcc,
        subject,
        body,
        isHtml: true,
      })
      toast.success('Email sent successfully')
      resetForm()
      onOpenChange(false)
    } catch {
      toast.error('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  // Handle body change from TipTapEditor
  const handleBodyChange = (html: string, isEmpty: boolean) => {
    setBody(html)
    setIsBodyEmpty(isEmpty)
  }

  // Handle confirmation dialog actions
  const handleConfirmDiscard = () => {
    setShowConfirmDialog(false)
    onOpenChange(false)
  }

  const handleKeepEditing = () => {
    setShowConfirmDialog(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] flex flex-col p-0"
          data-testid="compose-email-modal"
          hideClose
        >
          {/* Header - Sender row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <DialogTitle className="sr-only">New Message</DialogTitle>
            {settings?.SMTP_USER && (
              <span className="text-sm text-muted-foreground">
                发件人：{settings.SMTP_USER}
              </span>
            )}
            <DialogClose asChild>
              <button
                className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto space-y-4 py-4 px-4">
            {/* To Field */}
            <EmailChipInput
              id="to-input"
              emails={to}
              onChange={setTo}
              label="收件人"
              placeholder="可搜索邮箱、联系人..."
              disabled={sending}
              trailingActions={
                (!showCcField || !showBccField) && (
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    {!showCcField && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsCcExpanded(true)
                        }}
                        className="hover:text-foreground"
                      >
                        抄送
                      </button>
                    )}
                    {!showBccField && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsBccExpanded(true)
                        }}
                        className="hover:text-foreground"
                      >
                        密送
                      </button>
                    )}
                  </div>
                )
              }
            />

            {/* Cc Field (conditional) */}
            {showCcField && (
              <EmailChipInput
                emails={cc}
                onChange={setCc}
                label="抄送"
                id="cc-input"
                placeholder="可搜索邮箱、联系人..."
                disabled={sending}
              />
            )}

            {/* Bcc Field (conditional) */}
            {showBccField && (
              <EmailChipInput
                emails={bcc}
                onChange={setBcc}
                label="密送"
                id="bcc-input"
                placeholder="可搜索邮箱、联系人..."
                disabled={sending}
              />
            )}

            {/* Subject Field */}
            <div className="flex items-start min-h-[44px] border-b border-border/50 focus-within:bg-muted/20">
              <label htmlFor="subject-input" className="text-sm text-muted-foreground min-w-[5rem] flex-shrink-0 px-4 py-3">
                主题
              </label>
              <input
                id="subject-input"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="邮件主题"
                disabled={sending}
                className="flex-1 py-3 pr-4 outline-none bg-transparent text-sm"
              />
            </div>

            {/* Body - TipTapEditor */}
            <TipTapEditor
              value={body}
              onChange={handleBodyChange}
              disabled={sending}
              placeholder="Write your message here..."
            />
          </div>

          {/* Footer - Fixed bottom */}
          <div className="flex justify-between items-center px-4 py-3 border-t border-border/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              disabled={sending}
              aria-label="Trash"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            <Button onClick={handleSend} disabled={!isValid || sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Data Loss Prevention */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard email?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved content. Are you sure you want to close and
              discard this email?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepEditing}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}