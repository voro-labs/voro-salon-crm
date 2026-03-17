import { useSwipeStore } from 'lib/use-swipe-store';
import { SafeAreaView } from 'react-native-safe-area-context'
import React, { useEffect } from 'react';
import { SwipeStack } from 'components/SwipeStack';
import { ActiveFiltersBar } from 'components/ActiveFiltersBar';
import { FilterOnboarding } from 'components/FilterOnboarding';
import { View } from 'react-native';

export const DiscoverScreen: React.FC = () => {
	const {
		items,
		filters,
		like,
		dislike,
		superLike,
		setHasCompletedOnboarding,
		undo,
		canUndo,
		hasCompletedOnboarding
	} = useSwipeStore()

	const handleResetFilters = () => {
		setHasCompletedOnboarding(false)
	}

	if (!hasCompletedOnboarding) {
		return (
			<SafeAreaView className="flex-1 items-center justify-center bg-white">
				<FilterOnboarding
					onComplete={() => setHasCompletedOnboarding(true)}
					contentTypes={[
						{ label: "Filmes", value: "movie", emoji: "🎬" },
						{ label: "Séries", value: "series", emoji: "📺" },
						{ label: "Livros", value: "book", emoji: "📚" },
					]}
				/>
			</SafeAreaView>
		)
	}

	return (
		<SafeAreaView className="flex-1 bg-white">
			<View className="mt-4 px-4 items-center">
				<ActiveFiltersBar
					filters={filters}
					onReset={handleResetFilters}
				/>
			</View>

			<View className="w-full h-full">
				<SwipeStack
					items={items}
					onLike={like}
					onDislike={dislike}
					onSuperLike={superLike}
					onUndo={undo}
					canUndo={canUndo}
				/>
			</View>
		</SafeAreaView>
	);
};
