export default function PortalWorkoutLogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="-m-4 flex h-full min-h-0 flex-1 flex-col sm:-m-6 lg:-m-8">
      {children}
    </div>
  )
}
