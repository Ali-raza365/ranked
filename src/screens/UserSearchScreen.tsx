import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { collection, query, where, getDocs, limit, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useOtherUser } from '../hooks/useOtherUser';
import { followUser, unfollowUser } from '../firebase/userFunctions';
import { User } from '../types/user';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../styles/theme';
import debounce from 'lodash/debounce';

type RootStackParamList = {
  OtherUserProfile: { userId: string };
  // Add other screen names and their params here
};

type UserSearchScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OtherUserProfile'>;

type Props = {
  navigation: UserSearchScreenNavigationProp;
};

const SEARCH_LIMIT = 10; // Limit number of results
const DEBOUNCE_DELAY = 300; // Milliseconds to wait before searching

const UserSearchScreen: React.FC<Props> = ({ navigation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useCurrentUser();
  const searchCache = useRef<{ [key: string]: User[] }>({});

  const handleSearch = useCallback(async (term: string) => {
    if (term.trim() === '') {
      setSearchResults([]);
      return;
    }

    // Check cache first
    const cacheKey = term.toLowerCase();
    if (searchCache.current[cacheKey]) {
      setSearchResults(searchCache.current[cacheKey]);
      return;
    }

    setIsLoading(true);
    try {
      const searchTermLower = term.toLowerCase().trim();
      const q = query(
        collection(db, 'users'),
        where('displayNameLower', '>=', searchTermLower),
        where('displayNameLower', '<=', searchTermLower + '\uf8ff'),
        limit(SEARCH_LIMIT)
      );

      const querySnapshot = await getDocs(q);
      const users: User[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data() as User;
        if (userData.uid !== user?.uid) {
          users.push({ ...userData, uid: doc.id });
        }
      });

      // Cache the results
      searchCache.current[cacheKey] = users;
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Debounce the search function
  const debouncedSearch = useCallback(
    debounce((term: string) => handleSearch(term), DEBOUNCE_DELAY),
    [handleSearch]
  );

  const handleSearchInput = (text: string) => {
    setSearchTerm(text);
    if (text.trim()) {
      debouncedSearch(text);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={handleSearchInput}
            placeholder="Search users by username..."
            placeholderTextColor="#999"
          />
          {isLoading && (
            <ActivityIndicator 
              style={styles.searchIndicator} 
              size="small" 
              color={theme.colors.primary} 
            />
          )}
        </View>

        {searchTerm.trim() === '' ? (
          <Text style={styles.emptyText}>Start typing to search</Text>
        ) : isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            renderItem={({ item }) => (
              <UserSearchResult
                item={item}
                currentUserId={user?.uid}
                onUserPress={userId => navigation.navigate('OtherUserProfile', { userId })}
                isFollowing={user?.following?.includes(item.uid)}
              />
            )}
            keyExtractor={(item) => item.uid}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <Text style={styles.emptyText}>No users found</Text>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

interface UserSearchResultProps {
  item: User;
  currentUserId: string | undefined;
  onUserPress: (userId: string) => void;
  isFollowing?: boolean;
}

export const UserSearchResult: React.FC<UserSearchResultProps> = ({ 
  item, 
  currentUserId, 
  onUserPress,
  isFollowing = false
}) => {
  const { user: updatedUser } = useOtherUser(item.uid);
  const { user: currentUser } = useCurrentUser();
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const isCurrentUser = currentUserId === item.uid;
  const isBlocked = currentUser?.blockedUsers?.includes(item.uid);

  const handleFollowToggle = async () => {
    if (!currentUserId || !updatedUser || isCurrentUser) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentUserId, updatedUser.uid);
      } else {
        await followUser(currentUserId, updatedUser.uid);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status. Please try again.');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!currentUser) return;

    Alert.alert(
      'Unblock User',
      'Are you sure you want to unblock this user?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userRef, {
                blockedUsers: arrayRemove(item.uid)
              });
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Failed to unblock user');
            }
          }
        }
      ]
    );
  };

  if (!updatedUser) return null;

  const buttonText = isFollowing ? 'Following' : 'Follow';

  return (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => isBlocked ? null : onUserPress(updatedUser.uid)}
      disabled={isBlocked}
    >
      <Text style={[
        { fontFamily: theme.fonts.default },
        isBlocked && { color: theme.colors.textSecondary }
      ]}>
        @{updatedUser.displayName || 'No display name'}
      </Text>
      {!isCurrentUser && (
        isBlocked ? (
          <TouchableOpacity 
            style={[styles.followButton, styles.blockedButton]}
            onPress={handleUnblock}
          >
            <Text style={styles.followButtonText}>Blocked</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[
              styles.followButton, 
              isFollowing ? styles.followingButton : styles.followButton
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleFollowToggle();
            }}
            disabled={isFollowLoading}
          >
            {isFollowLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={[
                styles.followButtonText,
                isFollowing && styles.followingButtonText
              ]}>
                {buttonText}
              </Text>
            )}
          </TouchableOpacity>
        )
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: theme.colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: theme.colors.inputBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  searchIndicator: {
    position: 'absolute',
    right: 10,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
  },
  followButtonText: {
    color: theme.colors.buttonText,
    fontWeight: 'bold',
    fontFamily: theme.fonts.default,
  },
  followingButtonText: {
    color: theme.colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.default,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedButton: {
    backgroundColor: theme.colors.error,
    opacity: 0.8,
  },
});

export default UserSearchScreen;
