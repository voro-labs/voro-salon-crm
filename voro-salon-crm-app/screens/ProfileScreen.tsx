import React, { useMemo } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/auth.context';
import { useSwipeStore } from '../lib/use-swipe-store';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export const ProfileScreen: React.FC = () => {
  const { user, logout: signOut } = useAuth();
  const { profile, liked, history, isSyncing } = useSwipeStore();

  const preferences = useMemo(() => {
    const getTop = (record: Record<string, number>, limit = 6) =>
      Object.entries(record)
        .filter(([_, score]) => score > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

    return {
      topGenres: getTop(profile.genre),
      topEras: getTop(profile.era),
      topKeywords: getTop(profile.keywords),
    };
  }, [profile]);

  console.log(profile);

  const stats = [
    { label: 'Likes', value: liked.length, icon: 'heart' },
    { label: 'Histórico', value: history.length, icon: 'time' },
    {
      label: 'Interesses',
      value:
        preferences.topGenres.length +
        preferences.topEras.length +
        preferences.topKeywords.length,
      icon: 'star',
    },
  ];

  const InterestSection = ({ title, data, icon }: { title: string; data: [string, number][]; icon: string }) => {
    if (data.length === 0) return null;
    return (
      <View className="mb-6">
        <View className="flex-row items-center mb-3">
          <Ionicons name={icon as any} size={18} color="#7c3aed" />
          <Text className="text-lg font-bold text-zinc-800 ml-2">{title}</Text>
        </View>
        <View className="flex-row flex-wrap">
          {data.map(([name, score]) => (
            <View
              key={name}
              className="bg-zinc-100 border border-zinc-200 px-3 py-2 rounded-full mr-2 mb-2 flex-row items-center"
            >
              <Text className="text-zinc-700 font-medium">{name}</Text>
              <View className="ml-2 bg-purple-100 px-1.5 rounded-full">
                <Text className="text-[10px] text-purple-600 font-bold">{score}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-50">
      <ScrollView className="flex-1">
        {/* Header Section */}
        <View className="bg-white px-6 pt-8 pb-10 rounded-b-[40px] shadow-sm shadow-zinc-200">
          <View className="flex-row items-center justify-between mb-8">
            <View className="flex-row items-center">
              <Text className="text-2xl font-black text-zinc-900">Meu Perfil</Text>
              {isSyncing && (
                <View className="ml-3 bg-zinc-50 px-2 py-1 rounded-lg border border-zinc-100 flex-row items-center">
                  <ActivityIndicator size="small" color="#71717a" />
                  <Text className="text-[10px] font-bold text-zinc-500 ml-1.5 uppercase tracking-wider">Syncing</Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={signOut}
              className="h-10 w-10 bg-red-50 items-center justify-center rounded-2xl"
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </Pressable>
          </View>

          <View className="flex-row items-center">
            <View className="h-20 w-20 bg-purple-600 rounded-3xl items-center justify-center shadow-lg shadow-purple-200">
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} className="h-full w-full rounded-3xl" />
              ) : (
                <Text className="text-2xl font-bold text-white uppercase">
                  {user?.firstName?.[0] || user?.userName?.[0] || '?'}
                </Text>
              )}
            </View>
            <View className="ml-5 flex-1">
              <Text className="text-xl font-bold text-zinc-900">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.userName}
              </Text>
              <Text className="text-zinc-500 font-medium mt-0.5">{user?.email}</Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="flex-row justify-between mt-8 bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
            {stats.map((stat) => (
              <View key={stat.label} className="items-center flex-1">
                <Text className="text-lg font-black text-zinc-900">{stat.value}</Text>
                <Text className="text-[10px] uppercase font-bold text-zinc-400 mt-0.5">{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Preferences Section */}
        <View className="px-6 py-8">
          <Text className="text-xl font-black text-zinc-900 mb-6 tracking-tight">
            Meus Interesses
          </Text>

          {preferences.topGenres.length === 0 && (
            <View className="bg-white p-6 rounded-3xl items-center border border-zinc-100">
              <Ionicons name="heart-outline" size={40} color="#d4d4d8" />
              <Text className="text-zinc-500 text-center mt-3 font-medium">
                Continue dando "swipe" para descobrirmos o seu gosto!
              </Text>
            </View>
          )}

          <InterestSection title="Gêneros Favoritos" data={preferences.topGenres} icon="film-outline" />
          <InterestSection title="Eras Preferidas" data={preferences.topEras} icon="calendar-outline" />
          <InterestSection title="Palavras-chave" data={preferences.topKeywords} icon="pricetag-outline" />
        </View>

        {/* Footer Actions */}
        <View className="px-6 pb-10">
          <Pressable
            onPress={signOut}
            className="h-14 bg-white border border-red-100 rounded-2xl flex-row items-center justify-center shadow-sm shadow-red-50"
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text className="text-red-600 font-bold ml-2">Sair da Conta</Text>
          </Pressable>
          <Text className="text-zinc-400 text-center mt-4 text-xs font-medium">
            Versão 1.0.0 • Voro Labs
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
