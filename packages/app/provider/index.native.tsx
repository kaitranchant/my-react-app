import { SafeArea } from 'app/provider/safe-area'
import { AppleHealthSyncBootstrap } from './apple-health-sync.native'
import { NavigationProvider } from './navigation'

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <SafeArea>
      <NavigationProvider>
        <AppleHealthSyncBootstrap />
        {children}
      </NavigationProvider>
    </SafeArea>
  )
}
