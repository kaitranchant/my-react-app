export default function MyWorkoutLogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="-mx-4 -mt-6 flex min-h-0 flex-1 flex-col sm:-mx-6 lg:-mx-8">
      {children}
    </div>
  )
}
