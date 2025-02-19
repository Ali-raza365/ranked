import React, { useCallback, useMemo, useState } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import CurrentUserProfile from '../components/CurrentUserProfile';
import { Reaction } from '../types/ranking';
import { reactToRanking, cleanupFollowerCounts } from '../firebase/userFunctions';
import { theme } from '../styles/theme';
import { StyleSheet, View, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Alert } from 'react-native';

const ProfileScreen: React.FC = () => {
  const { user, loading } = useCurrentUser();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const navigateToFollowList = useCallback((type: 'followers' | 'following') => {
    if (!user?.uid) return;
    navigation.navigate('FollowList', { userId: user.uid, type });
  }, [navigation, user?.uid]);

  const toggleBadWordsMode = async () => {
    if (!user?.uid) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        badWordsMode: !(user.badWordsMode ?? false)
      });
    } catch (error) {
      console.error('Error updating bad words mode:', error);
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: user?.displayName ? `@${user.displayName}` : 'Profile',
      headerTitleStyle: {
        fontFamily: theme.fonts.default,
        fontSize: 18,
        fontWeight: 'bold',
      },
      headerRight: () => (
        <Menu>
          <MenuTrigger>
            <MaterialIcons 
              name="more-vert" 
              size={24} 
              color={theme.colors.text}
              style={styles.menuIcon} 
            />
          </MenuTrigger>
          <MenuOptions>
            <MenuOption onSelect={toggleBadWordsMode}>
              <View style={styles.menuOption}>
                <MaterialIcons 
                  name={user?.badWordsMode ?? false ? "check-box" : "check-box-outline-blank"} 
                  size={20} 
                  color={theme.colors.text} 
                />
                <Text style={styles.menuOptionText}>
                  Content Filter
                </Text>
              </View>
            </MenuOption>
            <MenuOption onSelect={() => setShowDeleteModal(true)}>
              <View style={styles.menuOption}>
                <MaterialIcons name="delete" size={20} color={theme.colors.error} />
                <Text style={[styles.menuOptionText, { color: theme.colors.error }]}>
                  Delete Account
                </Text>
              </View>
            </MenuOption>
          </MenuOptions>
        </Menu>
      ),
    });
  }, [navigation, user]);

  const handleReact = useCallback(async (rankingId: string, reaction: Reaction) => {
    if (!user) return;
    await reactToRanking(user.uid, rankingId, reaction);
  }, [user]);

  const ProfileComponent = useMemo(() => {
    if (loading || !user) return null;
    return (
      <View style={styles.container}>
        <CurrentUserProfile 
          onReact={handleReact} 
          showDeleteModal={showDeleteModal}
          setShowDeleteModal={setShowDeleteModal}
          onFollowersPress={() => navigateToFollowList('followers')}
          onFollowingPress={() => navigateToFollowList('following')}
        />
      </View>
    );
  }, [loading, user, handleReact, showDeleteModal, navigateToFollowList]);

  if (loading || !user) {
    return null;
  }

  return (
    <View style={styles.safeArea}>
      {ProfileComponent}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontFamily: theme.fonts.default,
    fontSize: 16,
    color: theme.colors.text,
  },
  errorText: {
    fontFamily: theme.fonts.default,
    fontSize: 16,
    color: theme.colors.error,
  },
  menuIcon: {
    padding: 8,
    marginRight: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuOptionText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: theme.fonts.default,
    color: theme.colors.text,
  },
});

export default React.memo(ProfileScreen);
