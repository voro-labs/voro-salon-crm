import React from 'react';
import { Favorites } from 'components/Favorites';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSwipeStore } from 'lib/use-swipe-store';

export const FavoritesScreen: React.FC = () => {
	const { superLiked } = useSwipeStore()

	return (
		<SafeAreaView className="flex-1 bg-white">
			<Favorites
				superLiked={superLiked}
				onRemove={() => { }}
			/>
		</SafeAreaView>
	);
};
