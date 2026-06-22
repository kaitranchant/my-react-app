import { toast } from 'sonner'

export const UNDO_TOAST_DURATION = 5000

export function toastSuccessWithUndo(
  message: string,
  onUndo: () => void | Promise<void>
) {
  toast.success(message, {
    duration: UNDO_TOAST_DURATION,
    action: {
      label: 'Undo',
      onClick: () => {
        void onUndo()
      },
    },
  })
}
