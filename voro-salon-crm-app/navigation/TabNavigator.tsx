import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { DiscoverScreen } from '../screens/DiscoverScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MatchesScreen } from 'screens/MatchesScreen';

export type RootTabParamList = {
    Discover: undefined;
    Matches: undefined;
    Favorites: undefined;
    Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export const TabNavigator: React.FC = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: '#6C47FF',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#F3F4F6',
                    paddingBottom: 6,
                    paddingTop: 6,
                    height: 64,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: React.ComponentProps<typeof Ionicons>['name'];

                    if (route.name === 'Discover') {
                        iconName = focused ? 'compass' : 'compass-outline';
                    } else if (route.name === 'Matches') {
                        iconName = focused ? 'heart' : 'heart-outline';
                    } else if (route.name === 'Favorites') {
                        iconName = focused ? 'star' : 'star-outline';
                    } else {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}>
            <Tab.Screen name="Discover" component={DiscoverScreen} />
            <Tab.Screen name="Matches" component={MatchesScreen} />
            <Tab.Screen name="Favorites" component={FavoritesScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};
