import { Tabs } from 'expo-router';
import { BookOpen, Search, Users, MessageSquare, Mic, UserCircle } from 'lucide-react-native';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: Colors.background,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          color: Colors.text,
          fontSize: 17,
          fontWeight: '700',
        },
        headerTintColor: Colors.primary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '서재',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          headerTitle: '📚 bookStory',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '탐색',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
          headerTitle: '책 탐색',
        }}
      />
      <Tabs.Screen
        name="clubs"
        options={{
          title: '모임',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          headerTitle: '독서모임',
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '커뮤니티',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
          headerTitle: '커뮤니티',
        }}
      />
      <Tabs.Screen
        name="recording"
        options={{
          title: '녹음분석',
          tabBarIcon: ({ color, size }) => <Mic color={color} size={size} />,
          headerTitle: '모임 녹음 분석',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />,
          headerTitle: '내 프로필',
        }}
      />
    </Tabs>
  );
}
