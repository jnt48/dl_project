// ─────────────────────────────────────────────────────────────────────────────
// navigation/AppNavigator.tsx
//
// Bottom-tab navigation with 4 tabs (Camera, History, How It Works, Model).
// The Camera tab is always the first (default) tab.
// A stack navigator is nested inside Camera to allow Settings to be pushed.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import { CameraScreen }          from '../screens/CameraScreen';
import { UploadScreen }          from '../screens/UploadScreen';
import { SettingsScreen }        from '../screens/SettingsScreen';
import { HistoryScreen }         from '../screens/HistoryScreen';
import { HowItWorksScreen }      from '../screens/HowItWorksScreen';
import { ModelComparisonScreen } from '../screens/ModelComparisonScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

/** Stack navigator for the camera tab: CameraScreen + SettingsScreen */
function CameraStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#111' },
        headerTintColor: '#FFD700',
        headerTitleStyle: { fontWeight: '900', fontSize: 20 },
      }}
    >
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{ headerShown: false }} // Camera screen is truly full-screen
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}

/** Icon helper: simple emoji icons for the tab bar */
function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Scan"
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#111', borderTopColor: '#333', height: 64 },
          tabBarActiveTintColor: '#FFD700',
          tabBarInactiveTintColor: '#666',
          tabBarLabelStyle: { fontSize: 12, marginBottom: 8 },
        }}
      >
        <Tab.Screen
          name="Scan"
          component={CameraStack}
          options={{
            tabBarLabel: 'Camera',
            tabBarIcon: ({ focused }) => <TabIcon emoji="📷" focused={focused} />,
            tabBarAccessibilityLabel: 'Live Camera Scanner',
          }}
        />
        <Tab.Screen
          name="Upload"
          component={UploadScreen}
          options={{
            tabBarLabel: 'Upload',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🖼️" focused={focused} />,
            tabBarAccessibilityLabel: 'Upload note photo from gallery',
          }}
        />
        <Tab.Screen
          name="History"
          component={HistoryScreen}
          options={{
            tabBarLabel: 'History',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🕒" focused={focused} />,
            tabBarAccessibilityLabel: 'Scan history',
          }}
        />
        <Tab.Screen
          name="HowItWorks"
          component={HowItWorksScreen}
          options={{
            tabBarLabel: 'How it works',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🧠" focused={focused} />,
            tabBarAccessibilityLabel: 'How it works — CNN explanation',
          }}
        />
        <Tab.Screen
          name="ModelInfo"
          component={ModelComparisonScreen}
          options={{
            tabBarLabel: 'Models',
            tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
            tabBarAccessibilityLabel: 'Model comparison table',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
