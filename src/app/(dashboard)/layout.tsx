import { Sidebar } from '@/components/dashboard/sidebar'
import { getAuthContext } from '@/lib/auth/session'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authContext = await getAuthContext()

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userName={authContext?.fullName || authContext?.email || null}
        userEmail={authContext?.email || null}
      />
      <main className="flex-1 overflow-auto">
        <div className="min-h-full p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
