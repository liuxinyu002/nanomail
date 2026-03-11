import { Toaster as Sonner } from 'sonner'

const Toaster = () => {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
        },
      }}
    />
  )
}

export { Toaster }