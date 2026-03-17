import React from 'react';
import { Matches } from 'components/Matches';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSwipeStore } from 'lib/use-swipe-store';

export const MatchesScreen: React.FC = () => {
	const { liked } = useSwipeStore()

	return (
		<SafeAreaView className="flex-1 bg-white">
			<Matches liked={liked} onRemove={() => { }} />
		</SafeAreaView>
	);
};
