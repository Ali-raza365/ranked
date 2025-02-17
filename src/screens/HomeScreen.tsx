import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity, RefreshControl, Animated, Easing, Platform, Vibration, StatusBar } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import CreateRankButton from '../components/CreateRankButton';
import RankingItem from '../components/RankingItem';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp, doc, deleteDoc, getDocs, getDoc, startAfter } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Ranking, Reaction } from '../types';
import { theme } from '../styles/theme';
import { reactToRanking } from '../firebase/userFunctions';
import LoadingScreen from '../components/LoadingScreen';
import { filterContent } from '../utils/contentFilter';

interface HomeScreenProps {
  navigation: NavigationProp<any>;
}

type FeedType = 'following' | 'global';

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [activeTab, setActiveTab] = useState<FeedType>('following');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useCurrentUser();
  const didMount = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePosts, setHasMoreMore] = useState(true);

  const filterRanking = useCallback((ranking: Ranking): boolean => {
    if (!user) return true;
    
    // Filter out content from blocked users
    if (user.blockedUsers?.includes(ranking.userId)) {
      return false;
    }

    // Then apply bad words filter
    const badWordsMode = user.badWordsMode ?? true;

    if (!filterContent(ranking.title, badWordsMode)) {
      return false;
    }

    for (const item of ranking.items) {
      if (!filterContent(item.content, badWordsMode)) {
        return false;
      }
    }

    return true;
  }, [user]);

  const removeDuplicates = (rankings: Ranking[]) => {
    const seen = new Set();
    return rankings.filter(ranking => {
      if (seen.has(ranking.id)) {
        return false;
      }
      seen.add(ranking.id);
      return true;
    });
  };

  const fetchRankings = async (tabType: FeedType, loadMore = false) => {
    if (!user || (loadMore && !hasMorePosts)) return;
    
    if (!loadMore) {
      setIsLoading(true);
      setLastVisible(null);
    } else {
      setIsLoadingMore(true);
    }
    
    const rankingsRef = collection(db, 'rankings');
    let q;
    
    if (tabType === 'following') {
      q = query(
        rankingsRef,
        where('visibility', 'in', ['global', 'friends']),
        orderBy('createdAt', 'desc'),
        ...(lastVisible && loadMore ? [startAfter(lastVisible)] : []),
        limit(50)
      );

      try {
        const snapshot = await getDocs(q);
        const fetchedRankings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt instanceof Timestamp 
            ? doc.data().createdAt.toDate() 
            : new Date(doc.data().createdAt)
        })) as Ranking[];

        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMoreMore(snapshot.docs.length === 50);

        const followingIds = new Set([...(user.following || []), user.uid]);
        const filteredRankings = fetchedRankings
          .filter(ranking => followingIds.has(ranking.userId))
          .filter(filterRanking)
          .slice(0, 20);

        setRankings(prev => {
          const newRankings = loadMore 
            ? [...prev, ...filteredRankings]
            : filteredRankings;
          return removeDuplicates(newRankings);
        });
      } catch (error) {
        console.error('Error fetching rankings:', error);
      }
    } else {
      q = query(
        rankingsRef,
        where('visibility', '==', 'global'),
        orderBy('createdAt', 'desc'),
        ...(lastVisible && loadMore ? [startAfter(lastVisible)] : []),
        limit(20)
      );
      
      try {
        const snapshot = await getDocs(q);
        const fetchedRankings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt instanceof Timestamp 
            ? doc.data().createdAt.toDate() 
            : new Date(doc.data().createdAt)
        })) as Ranking[];

        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setHasMoreMore(snapshot.docs.length === 20);

        const filteredRankings = fetchedRankings.filter(filterRanking);
        setRankings(prev => {
          const newRankings = loadMore 
            ? [...prev, ...filteredRankings]
            : filteredRankings;
          return removeDuplicates(newRankings);
        });
      } catch (error) {
        console.error('Error fetching rankings:', error);
      }
    }

    setIsLoading(false);
    setIsLoadingMore(false);
    setIsRefreshing(false);
  };

  // Only fetch once on mount
  useEffect(() => {
    if (!didMount.current && user) {
      didMount.current = true;
      fetchRankings('following');
    }
  }, [user]);

  const handleTabChange = (newTab: FeedType) => {
    setActiveTab(newTab);
    fetchRankings(newTab);
    // More aggressive scroll to top
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    // Backup scroll after a small delay to ensure it catches
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchRankings(activeTab);
  };

  const handleDelete = useCallback(async (rankingId: string) => {
    try {
      await deleteDoc(doc(db, 'rankings', rankingId));
      setRankings(prevRankings => prevRankings.filter(ranking => ranking.id !== rankingId));
    } catch (error) {
      console.error('Error deleting ranking:', error);
    }
  }, []);

  const handleReact = useCallback(async (rankingId: string, reaction: Reaction) => {
    if (!user) return;
    try {
      await reactToRanking(user.uid, rankingId, reaction);
      // Set up a one-time listener for this specific ranking
      const rankingRef = doc(db, 'rankings', rankingId);
      const unsubscribe = onSnapshot(rankingRef, (doc) => {
        if (doc.exists()) {
          const updatedRanking = {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt instanceof Timestamp 
              ? doc.data().createdAt.toDate() 
              : new Date(doc.data().createdAt)
          } as Ranking;

          setRankings(prevRankings => 
            prevRankings.map(ranking => 
              ranking.id === rankingId ? updatedRanking : ranking
            )
          );
        }
        // Unsubscribe after getting the update
        unsubscribe();
      });
    } catch (error) {
      console.error('Error reacting to ranking:', error);
    }
  }, [user]);

  const TabSelector = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'following' && styles.activeTab]}
        onPress={() => handleTabChange('following')}
      >
        <Text style={[
          styles.tabText,
          activeTab === 'following' && styles.activeTabText
        ]}>Following</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'global' && styles.activeTab]}
        onPress={() => handleTabChange('global')}
      >
        <Text style={[
          styles.tabText,
          activeTab === 'global' && styles.activeTabText
        ]}>Global</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = useCallback(({ item }: { item: Ranking }) => {
    return (
      <RankingItem
        item={item}
        currentUserId={user?.uid}
        onDelete={handleDelete}
        onReact={handleReact}
      />
    );
  }, [user?.uid, handleDelete, handleReact]);

  const SpinningFace: React.FC = () => {
    const spinValue = new Animated.Value(0);

    React.useEffect(() => {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }, []);

    const spin = spinValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg']
    });

    return (
      <View style={styles.spinnerContainer}>
        <Animated.Text 
          style={[
            styles.spinningFace,
            { transform: [{ rotate: spin }] }
          ]}
        >
          {'-_-'}
        </Animated.Text>
      </View>
    );
  };

  const ListEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.loadingText}>Loading rankings...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {activeTab === 'following' 
            ? "Follow someone!"
            : "No ranks yet :("}
        </Text>
      </View>
    );
  }, [isLoading, activeTab]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMorePosts) {
      fetchRankings(activeTab, true);
    }
  };

  return (
    <View style={styles.container}>
       <StatusBar barStyle="dark-content" />
      <TabSelector />
      <FlatList
        ref={flatListRef}
        data={rankings}
        renderItem={renderItem}
        keyExtractor={(item) => `${item.id}-${item.userId}`}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.listContainer}
        removeClippedSubviews={false}
        maxToRenderPerBatch={3}
        windowSize={3}
        initialNumToRender={3}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <Text style={styles.loadingText}>Loading more...</Text>
            </View>
          ) : null
        )}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
            progressViewOffset={10}
          />
        }
      />
      <CreateRankButton onPress={() => navigation.navigate('CreateRanking')} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.default,
  },
  activeTabText: {
    color: theme.colors.buttonText,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontFamily: theme.fonts.default,
    lineHeight: 24,
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  spinningFace: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.default,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default HomeScreen;
