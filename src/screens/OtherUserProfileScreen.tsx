import React, { useEffect, useCallback } from 'react';
import { Alert, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Menu, MenuTrigger, MenuOptions, MenuOption } from 'react-native-popup-menu';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import OtherUserProfile from '../components/OtherUserProfile';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Reaction } from '../types'; // Import from types index
import { reactToRanking } from '../firebase/userFunctions';
import { useOtherUser } from '../hooks/useOtherUser';
import { StyleSheet, View, SafeAreaView, FlatList } from 'react-native';
import { theme } from '../styles/theme';

type SearchStackParamList = {
  OtherUserProfile: { userId: string };
};

type OtherUserProfileScreenRouteProp = RouteProp<SearchStackParamList, 'OtherUserProfile'>;
type OtherUserProfileScreenNavigationProp = StackNavigationProp<SearchStackParamList, 'OtherUserProfile'>;

type Props = {
  route: OtherUserProfileScreenRouteProp;
  navigation: OtherUserProfileScreenNavigationProp;
};

const OtherUserProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId } = route.params;
  const { user: currentUser } = useCurrentUser();
  const { user: otherUser, loading } = useOtherUser(userId);

  const isBlocked = currentUser?.blockedUsers?.includes(userId);

  const handleBlockUser = useCallback(async () => {
    if (!currentUser) return;

    const message = isBlocked 
      ? 'Are you sure you want to unblock this user?' 
      : 'Are you sure you want to block this user? You won\'t see their content anymore.';

    Alert.alert(
      isBlocked ? 'Unblock User' : 'Block User',
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const userRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userRef, {
                blockedUsers: isBlocked 
                  ? arrayRemove(userId)
                  : arrayUnion(userId)
              });
              
              if (!isBlocked) {
                // If we're blocking the user, navigate back
                navigation.goBack();
              }
            } catch (error) {
              console.error('Error updating block status:', error);
              Alert.alert('Error', 'Failed to update block status');
            }
          }
        }
      ]
    );
  }, [currentUser, userId, isBlocked, navigation]);

  useEffect(() => {
    if (!loading && otherUser) {
      navigation.setOptions({
        headerTitle: otherUser.displayName ? `@${otherUser.displayName}` : 'Profile',
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
              <MenuOption onSelect={handleBlockUser}>
                <View style={styles.menuOption}>
                  <MaterialIcons 
                    name={isBlocked ? "person-add" : "block"} 
                    size={20} 
                    color={theme.colors.error} 
                  />
                  <Text style={[styles.menuOptionText, { color: theme.colors.error }]}>
                    {isBlocked ? 'Unblock User' : 'Block User'}
                  </Text>
                </View>
              </MenuOption>
            </MenuOptions>
          </Menu>
        ),
      });
    }
  }, [navigation, otherUser, loading, handleBlockUser, isBlocked]);

  const handleReact = async (rankingId: string, reaction: Reaction) => {
    if (!currentUser) return;
    await reactToRanking(currentUser.uid, rankingId, reaction);
    // You might want to refresh the other user's rankings here
  };

  const renderHeader = () => (
    <View style={styles.container}>
      <OtherUserProfile 
        userId={userId} 
        onReact={handleReact} 
        navigation={navigation}
      />
    </View>
  );

  if (loading) {
    return null; // or a loading indicator
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.flatListContent}
      />
    </SafeAreaView>
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
  flatListContent: {
    flexGrow: 1,
  },
  headerTitle: {
    fontFamily: theme.fonts.default,
    fontSize: 20,
    fontWeight: 'bold',
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
  },
});

export default OtherUserProfileScreen;
