export default function PortalWorkoutLogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col md:-m-6 lg:-m-8">
      {children}
    </div>
  )
}
