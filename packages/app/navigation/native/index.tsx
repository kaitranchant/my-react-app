import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { AppleHealthScreen } from 'app/features/wearables/apple-health-screen.native'
import { HomeScreen } from 'app/features/home/screen'
import { UserDetailScreen } from 'app/features/user/detail-screen'

const Stack = createNativeStackNavigator<{
  home: undefined
  'user-detail': {
    id: string
  }
  'apple-health': undefined
}>()

export function NativeNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="home"
        component={HomeScreen}
        options={{
          title: 'Coaching App',
        }}
      />
      <Stack.Screen
        name="apple-health"
        component={AppleHealthScreen}
        options={{
          title: 'Apple Health',
        }}
      />
      <Stack.Screen
        name="user-detail"
        component={UserDetailScreen}
        options={{
          title: 'User',
        }}
      />
    </Stack.Navigator>
  )
}
