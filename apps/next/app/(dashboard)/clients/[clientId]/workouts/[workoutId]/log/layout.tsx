export default function CoachWorkoutLogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col md:-mx-6 md:-mt-2 lg:-mx-8">
      {children}
    </div>
  )
}
