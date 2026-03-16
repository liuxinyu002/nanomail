/**
 * ComposeEmailModal Component
 *
 * Main compose email modal with:
 * - EmailChipInput for recipients (To/Cc/Bcc)
 * - TipTapEditor for email body
 * - Data loss prevention with AlertDialog
 * - Loading states during send
 */

import { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { EmailChipInput } from './EmailChipInput'
import { TipTapEditor } from './TipTapEditor'
import { useSettings } from '@/hooks/useSettings'
import { EmailService } from '@/services/email.service'

interface ComposeEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComposeEmailModal({
  open,
  onOpenChange,
}: ComposeEmailModalProps) {
  const { data: settings } = useSettings()

  // Form state
  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [bcc, setBcc] = useState<string[]>([])
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isBodyEmpty, setIsBodyEmpty] = useState(true)
  const [sending, setSending] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Determine if Cc/Bcc fields should be shown
  const showCcField = showCc || cc.length > 0
  const showBccField = showBcc || bcc.length > 0

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
    setShowCc(false)
    setShowBcc(false)
  }, [])

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
          className="max-w-2xl h-[80vh] flex flex-col"
          data-testid="compose-email-modal"
        >
          {/* Header */}
          <DialogHeader className="flex-shrink-0 border-b pb-4">
            <DialogTitle className="flex items-center gap-2">
              New Message
              {settings?.SMTP_USER && (
                <span
                  className="text-sm font-normal text-muted-foreground truncate max-w-[200px]"
                  title={settings.SMTP_USER}
                >
                  from {settings.SMTP_USER}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* To Field */}
            <EmailChipInput
              emails={to}
              onChange={setTo}
              label="To"
              placeholder="Enter recipient email"
              disabled={sending}
            />

            {/* Cc/Bcc Toggle Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCc(!showCc)}
                disabled={sending}
              >
                Cc
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowBcc(!showBcc)}
                disabled={sending}
              >
                Bcc
              </Button>
            </div>

            {/* Cc Field (conditional) */}
            {showCcField && (
              <EmailChipInput
                emails={cc}
                onChange={setCc}
                label="Cc"
                placeholder="Enter Cc email"
                disabled={sending}
              />
            )}

            {/* Bcc Field (conditional) */}
            {showBccField && (
              <EmailChipInput
                emails={bcc}
                onChange={setBcc}
                label="Bcc"
                placeholder="Enter Bcc email"
                disabled={sending}
              />
            )}

            {/* Subject Field */}
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                disabled={sending}
                aria-label="Subject"
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

          {/* Footer */}
          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={sending}
            >
              Cancel
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
          </DialogFooter>
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