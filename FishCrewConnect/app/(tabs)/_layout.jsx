import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useNotifications } from '../../context/NotificationContext';

export default function TabsLayout() {
  const { unreadCount } = useNotifications();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#44DBE9',
        tabBarInactiveTintColor: '#999',
        headerShown: false, // Disable default header in tab navigator
        tabBarLabel: ({ children, color, focused }) => (
          <Text style={{
            color: focused ? '#44DBE9' : '#999',
            fontSize: 12,
            marginBottom: 2
          }}>
            {children}
          </Text>
        )
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color }) => <Ionicons name="briefcase-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-applications"
        options={{
          title: "Applications",
          tabBarIcon: ({ color }) => <Ionicons name="document-text-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarIcon: ({ color }) => (
            <View>
              <Ionicons name="notifications-outline" size={24} color={color} />
              {unreadCount > 0 && (
                <View style={{
                  position: 'absolute',
                  right: -6,
                  top: -4,
                  backgroundColor: 'red',
                  borderRadius: 10,
                  width: unreadCount > 9 ? 20 : 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
