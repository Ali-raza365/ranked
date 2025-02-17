import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator, Animated } from 'react-native';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useOtherUser } from '../hooks/useOtherUser';
import { collection, query, where, getDocs, deleteDoc, doc, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Ranking, Reaction } from '../types/ranking';
import RankingItem from './RankingItem';
import { followUser, unfollowUser } from '../firebase/userFunctions';
import { theme } from '../styles/theme';
import { filterContent } from '../utils/contentFilter';

interface OtherUserProfileProps {
  userId: string;
  onReact: (rankingId: string, reaction: Reaction) => Promise<void>;
  navigation: any;
}

const OtherUserProfile: React.FC<OtherUserProfileProps> = ({ userId, onReact, navigation }) => {
  const { user: currentUser } = useCurrentUser();
  const { user: profileUser, loading } = useOtherUser(userId);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isHater, setIsHater] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);

  const isCurrentUser = currentUser?.uid === userId;

  const filterRanking = useCallback((ranking: Ranking): boolean => {
    if (!currentUser) return true;
    const badWordsMode = currentUser.badWordsMode ?? true; // Use current user's preferences

    // Check the title
    if (!filterContent(ranking.title, badWordsMode)) {
      return false;
    }

    // Check each item's content
    for (const item of ranking.items) {
      if (!filterContent(item.content, badWordsMode)) {
        return false;
      }
    }

    return true;
  }, [currentUser]);

  useEffect(() => {
    const fetchRankings = async () => {
      if (!userId) return;
      
      let visibilityFilter = ['global'];
      
      // Only include friends-only posts if the current user follows this user
      if (currentUser?.following?.includes(userId)) {
        visibilityFilter.push('friends');
      }
      
      const rankingsQuery = query(
        collection(db, 'rankings'),
        where('userId', '==', userId),
        where('visibility', 'in', visibilityFilter),
        orderBy('createdAt', 'desc')
      );

      try {
        const rankingsSnapshot = await getDocs(rankingsQuery);
        const fetchedRankings = rankingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ranking));
        setRankings(fetchedRankings);
      } catch (error) {
        console.error("Error fetching rankings:", error);
      }
    };

    fetchRankings();
  }, [userId, currentUser?.following]);

  useEffect(() => {
    if (currentUser && profileUser) {
      setIsFollowing(currentUser.following?.includes(profileUser.uid) || false);
    }
  }, [currentUser, profileUser]);

  useEffect(() => {
    const userRef = doc(db, 'users', userId);
    getDoc(userRef).then((doc) => {
      if (doc.exists()) {
        setIsHater(doc.data().isHater || false);
        setNickname(doc.data().easterEggNickname || null);
      }
    });
  }, [userId]);

  const handleFollowToggle = useCallback(async () => {
    if (!currentUser || !profileUser) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentUser.uid, profileUser.uid);
      } else {
        await followUser(currentUser.uid, profileUser.uid);
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  }, [currentUser, profileUser, isFollowing]);

  const handleDelete = async (rankingId: string) => {
    // For other users' profiles, we typically don't allow deletion
    // But if you want to implement it for admins or specific cases:
    try {
      if (currentUser?.uid === userId) {
        await deleteDoc(doc(db, 'rankings', rankingId));
        setRankings(prevRankings => prevRankings.filter(ranking => ranking.id !== rankingId));
      } else {
        Alert.alert('Error', 'You do not have permission to delete this ranking.');
      }
    } catch (error) {
      console.error('Error deleting ranking:', error);
      Alert.alert('Error', 'Failed to delete ranking. Please try again.');
    }
  };

  const keyExtractor = useCallback((item: Ranking) => item.id, []);
  
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 200,
    offset: 200 * index,
    index,
  }), []);

  const renderItem = useCallback(({ item }: { item: Ranking }) => (
    <RankingItem
      item={item}
      currentUserId={currentUser?.uid}
      onDelete={handleDelete}
      onReact={onReact}
    />
  ), [currentUser?.uid, handleDelete, onReact]);

  const handleFollowersPress = useCallback(() => {
    if (profileUser?.uid) {
      navigation.navigate('FollowList', {
        userId: profileUser.uid,
        type: 'followers'
      });
    }
  }, [navigation, profileUser?.uid]);

  const handleFollowingPress = useCallback(() => {
    if (profileUser?.uid) {
      navigation.navigate('FollowList', {
        userId: profileUser.uid,
        type: 'following'
      });
    }
  }, [navigation, profileUser?.uid]);

  const getEmptyMessage = () => {
    if (!rankings.length) {
      return currentUser?.following?.includes(userId)
        ? "No rankings yet"
        : "Follow to see friend-only rankings";
    }
    return null;
  };

  if (loading || !profileUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.profileBox}>
        {isHater && (
          <Text style={styles.haterText}>big fat ugly loser</Text>
        )}
        {nickname && (
          <Text style={styles.nicknameText}>
            "{nickname}"
          </Text>
        )}
        <Text style={styles.fullName}>{profileUser?.fullName}</Text>
        <Text style={styles.username}>@{profileUser?.displayName}</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.followContainer}>
            <TouchableOpacity onPress={handleFollowersPress}>
              <Text style={styles.followText}>Followers: {profileUser.followerCount || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFollowingPress}>
              <Text style={styles.followText}>Following: {profileUser.followingCount || 0}</Text>
            </TouchableOpacity>
          </View>
          {!isCurrentUser && (
            <TouchableOpacity 
              style={[
                styles.followButton, 
                isFollowing && styles.followingButton,
                isFollowLoading && styles.loadingButton
              ]} 
              onPress={handleFollowToggle}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.followButtonText}>
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <FlatList
        data={rankings}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        initialNumToRender={5}
        updateCellsBatchingPeriod={100}
        getItemLayout={getItemLayout}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBox: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    marginBottom: 16,
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  username: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.default,
    marginBottom: 8,
  },
  haterText: {
    color: 'red',
    fontSize: 12,
    fontFamily: theme.fonts.default,
    marginBottom: 4,
  },
  nicknameText: {
    color: '#2ecc71',
    fontSize: 12,
    fontFamily: theme.fonts.default,
    marginBottom: 4,
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 20,
  },
  followContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  followText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.default,
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    ...theme.shadows.small,
  },
  followingButton: {
    backgroundColor: theme.colors.secondary,
  },
  loadingButton: {
    backgroundColor: theme.colors.disabled,
  },
  followButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.default,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontFamily: theme.fonts.default,
    marginTop: 16,
  },
  listContainer: {
    flexGrow: 1,
  },
  thisIsYouText: {
    color: theme.colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: theme.fonts.default,
  },
});

export default React.memo(OtherUserProfile);
