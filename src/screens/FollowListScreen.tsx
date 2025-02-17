import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList, Text } from 'react-native';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useOtherUser } from '../hooks/useOtherUser';
import { theme } from '../styles/theme';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { User } from '../types/user';
import { UserSearchResult } from './UserSearchScreen'; // We'll need to export this component

type RootStackParamList = {
  FollowList: {
    userId: string;
    type: 'followers' | 'following';
  };
};

type FollowListScreenRouteProp = RouteProp<RootStackParamList, 'FollowList'>;

type Props = {
  route: FollowListScreenRouteProp;
};

const FollowListScreen: React.FC<Props> = ({ route }) => {
  const { userId, type } = route.params;
  const { user: currentUser } = useCurrentUser();
  const { user: targetUser } = useOtherUser(userId);
  const navigation = useNavigation<StackNavigationProp<any>>();

  const userList = type === 'followers' 
    ? targetUser?.followers || []
    : targetUser?.following || [];

  const isFollowing = useCallback((userId: string) => {
    return currentUser?.following?.includes(userId) ?? false;
  }, [currentUser?.following]);

  const renderItem = ({ item: userId }: { item: string }) => (
    <UserSearchResult
      item={{ uid: userId } as User}
      currentUserId={currentUser?.uid}
      onUserPress={(userId) => navigation.navigate('OtherUserProfile', { userId })}
      isFollowing={isFollowing(userId)}
    />
  );

  return (
    <View style={styles.container}>
      {userList.length > 0 ? (
        <FlatList
          data={userList}
          renderItem={renderItem}
          keyExtractor={(item) => item}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No {type} yet
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.default,
  },
});

export default FollowListScreen; 