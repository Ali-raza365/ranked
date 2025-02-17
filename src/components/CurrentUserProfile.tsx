import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, Animated } from 'react-native';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../styles/theme';
import { useAuth } from '../firebase/AuthContext';
import { Reaction } from '../types/ranking';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import RankingItem from './RankingItem';
import { Ranking } from '../types/ranking';
import { db } from '../firebase/firebase';
import { deleteUser } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { Audio } from 'expo-av';

interface CurrentUserProfileProps {
  onReact: (rankingId: string, reaction: Reaction) => Promise<void>;
  showDeleteModal: boolean;
  setShowDeleteModal: (show: boolean) => void;
  onFollowersPress: () => void;
  onFollowingPress: () => void;
}

type ProfileTab = 'public' | 'private';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ visible, onClose, onConfirm }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>DELETE ACCOUNT</Text>
          <Text style={styles.modalText}>
            This action cannot be undone. All your rankings and data will be permanently deleted.{'\n\n'}
            To confirm the erasure of your account, pull the trigger to kill Billy the Cat 
            (he's here for treats){'\n\n'}
            🐱 🔫
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={onClose}
            >
              <Text style={styles.saveButtonText}>
                Save Billy{'\n'}(The Correct Decision)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={onConfirm}
            >
              <Text style={styles.deleteButtonText}>
                Murder Billy{'\n'}(Delete Account)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const CurrentUserProfile: React.FC<CurrentUserProfileProps> = ({ 
  onReact, 
  showDeleteModal, 
  setShowDeleteModal,
  onFollowersPress,
  onFollowingPress
}) => {
  const { signOut } = useAuth();
  const { user } = useCurrentUser();
  const navigation = useNavigation<StackNavigationProp<ProfileStackParamList>>();
  
  // Group all useState hooks together at the top
  const [selectedTab, setSelectedTab] = useState<'rankings' | 'reranks'>('rankings');
  const [isLoading, setIsLoading] = useState(false);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [reranks, setReranks] = useState<any[]>([]);
  const [profileTab, setProfileTab] = useState<ProfileTab>('public');
  const [refreshKey, setRefreshKey] = useState(0);
  const [nickname, setNickname] = useState<string | null>(null);
  const [isHater, setIsHater] = useState(false);

  // Memoize the query to prevent recreating on every render
  const rankingsQuery = useMemo(() => {
    if (!user?.uid) return null;
    
    return query(
      collection(db, 'rankings'),
      where('userId', '==', user.uid),
      where('visibility', profileTab === 'public' ? 'in' : '==', 
        profileTab === 'public' ? ['global', 'friends'] : 'private'),
      orderBy('createdAt', 'desc')
    );
  }, [user?.uid, refreshKey, profileTab]);

  // Use the memoized query in the effect
  useEffect(() => {
    if (!rankingsQuery) return;

    const unsubscribe = onSnapshot(rankingsQuery, 
      (snapshot) => {
        const userRankings = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate()
          } as Ranking;
        });
        setRankings(userRankings);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error in rankings query:', error);
      }
    );

    return () => unsubscribe();
  }, [rankingsQuery]);

  // Load saved preferences
  useEffect(() => {
    if (user?.uid) {
      const userRef = doc(db, 'users', user.uid);
      getDoc(userRef).then((doc) => {
        if (doc.exists()) {
          setNickname(doc.data().easterEggNickname || null);
          setIsHater(doc.data().isHater || false);
        }
      });
    }
  }, [user?.uid]);

  const handleDelete = useCallback(async (rankingId: string) => {
    try {
      await deleteDoc(doc(db, 'rankings', rankingId));
    } catch (error) {
      console.error('Error deleting ranking:', error);
      Alert.alert('Error', 'Failed to delete ranking');
    }
  }, []);

  const handleFollowersPress = useCallback(() => {
    if (user?.uid) {
      navigation.navigate('FollowList', {
        userId: user.uid,
        type: 'followers'
      });
    }
  }, [navigation, user?.uid]);

  const handleFollowingPress = useCallback(() => {
    if (user?.uid) {
      navigation.navigate('FollowList', {
        userId: user.uid,
        type: 'following'
      });
    }
  }, [navigation, user?.uid]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user?.uid) return;
    try {
      // Delete user document and auth account
      await deleteDoc(doc(db, 'users', user.uid));
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account');
    }
  }, [user?.uid]);

  const playFartSound = async () => {
    try {
      console.log('Attempting to play sound...'); // Add debug log
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/fart.mp3'),
        { shouldPlay: true }
      );
      await sound.playAsync();
      // Wait a bit before unloading
      setTimeout(() => {
        sound.unloadAsync();
      }, 1000);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleLongPress = () => {
    Alert.alert(
      "Hey! It's me, Harry, I made the app! You found a secret!",
      "Do you like the app?",
      [
        {
          text: "Yes! I love the app AND you, Harry!",
          onPress: async () => {
            Alert.prompt(
              "Choose a Nickname",
              "Enter a cool nickname for yourself:",
              [
                { 
                  text: "Cancel", 
                  onPress: () => {}, 
                  style: 'cancel' 
                },
                { 
                  text: "OK", 
                  onPress: (value?: string) => {
                    if (value && user?.uid) {
                      const userRef = doc(db, 'users', user.uid);
                      updateDoc(userRef, {
                        easterEggNickname: value,
                        isHater: false
                      }).then(() => {
                        setNickname(value);
                        setIsHater(false);
                      });
                    }
                  }
                }
              ]
            );
          }
        },
        {
          text: "No I hate it",
          onPress: async () => {
            if (user?.uid) {
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                isHater: true,
                easterEggNickname: null
              });
              setIsHater(true);
              setNickname(null);
            }
          },
        },
        {
          text: "Fart Button",
          onPress: playFartSound
        }
      ]
    );
  };

  // Add TabSelector component
  const TabSelector = () => (
    <View style={styles.tabContainer}>
      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.tab, profileTab === 'public' && styles.activeTab]}
          onPress={() => setProfileTab('public')}
        >
          <Text style={[styles.tabText, profileTab === 'public' && styles.activeTabText]}>
            Public/Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, profileTab === 'private' && styles.activeTab]}
          onPress={() => setProfileTab('private')}
        >
          <Text style={[styles.tabText, profileTab === 'private' && styles.activeTabText]}>
            Private
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Memoize header component
  const ListHeader = useCallback(() => (
    <>
      <View style={styles.userInfoContainer}>
        <View style={styles.userInfo}>
          <TouchableOpacity 
            onLongPress={handleLongPress} 
            delayLongPress={3000}
          >
            {isHater && (
              <Text style={styles.haterText}>big fat ugly loser</Text>
            )}
            {nickname && (
              <Text style={styles.nicknameText}>
                "{nickname}"
              </Text>
            )}
            <Text style={styles.fullName}>{user?.fullName}</Text>
          </TouchableOpacity>
          <Text style={styles.email}>{user?.email}</Text>
          
          <View style={styles.followContainer}>
            <TouchableOpacity onPress={onFollowersPress}>
              <Text style={styles.followText}>Followers: {user?.followerCount || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onFollowingPress}>
              <Text style={styles.followText}>Following: {user?.followingCount || 0}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.divider} />
      <TabSelector />
    </>
  ), [user, signOut, profileTab, onFollowersPress, onFollowingPress, nickname]);

  const renderItem = useCallback(({ item }: { item: Ranking }) => (
    <View style={{ paddingHorizontal: 16 }}>
      <RankingItem
        item={item}
        currentUserId={user?.uid}
        onDelete={handleDelete}
        onReact={onReact}
      />
    </View>
  ), [user?.uid, handleDelete, onReact]);

  return (
    <View style={styles.container}>
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
      />
      <FlatList
        ListHeaderComponent={ListHeader}
        data={rankings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onRefresh={() => setRefreshKey(prev => prev + 1)}
        refreshing={isLoading}
      />
    </View>
  );
};

type ProfileStackParamList = {
  ProfileScreen: undefined;
  FollowList: { userId: string; type: 'followers' | 'following' };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  listContainer: {
    paddingBottom: 16,
  },
  userInfoContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    marginTop: 16,
    ...theme.shadows.small,
  },
  userInfo: {
    padding: 20,
    alignItems: 'center',
  },
  fullName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    fontFamily: theme.fonts.default,
  },
  username: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontFamily: theme.fonts.default,
  },
  email: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    fontFamily: theme.fonts.default,
  },
  followContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 16,
  },
  followText: {
    fontSize: 14,
    color: theme.colors.text,
    marginHorizontal: 8,
    fontFamily: theme.fonts.default,
  },
  signOutButton: {
    padding: 8,
    backgroundColor: theme.colors.error,
    borderRadius: 4,
  },
  signOutText: {
    color: theme.colors.buttonText,
    fontWeight: 'bold',
    fontFamily: theme.fonts.default,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 16,
    marginHorizontal: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  mainTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 4,
    flex: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  activeTabText: {
    color: theme.colors.buttonText,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  modalButtons: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.text,
  },
  saveButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.default,
    textAlign: 'center',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: theme.colors.error,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: theme.colors.buttonText,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.default,
    textAlign: 'center',
  },
  haterText: {
    color: 'red',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: theme.fonts.default,
    marginBottom: 4,
  },
  nicknameText: {
    color: '#2ecc71', // Nice green color
    fontSize: 12,
    textAlign: 'center',
    fontFamily: theme.fonts.default,
    marginBottom: 4,
    fontWeight: '600',
  },
});

export default React.memo(CurrentUserProfile);
