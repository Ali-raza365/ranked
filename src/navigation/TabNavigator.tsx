import React, { useRef, useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, StackNavigationOptions } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import UserSearchScreen from '../screens/UserSearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OtherUserProfileScreen from '../screens/OtherUserProfileScreen';
import CreateRanking from '../screens/CreateRanking';
import RankingDetailScreen from '../screens/RankingDetailScreen';
import EditRanking from '../screens/EditRanking';
import { theme } from '../styles/theme';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { SerializableRanking } from '../types/ranking';
import RerankScreen from '../screens/RerankScreen';
import { Ranking } from '../types/ranking';
import { Image, TouchableOpacity, Text, View, Platform, Modal } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import InviteScreen from '../screens/InviteScreen';
import Confetti from 'react-native-confetti';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import NotificationsScreen from '../screens/NotificationsScreen';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { requestNotificationPermissions } from '../utils/notificationPermissions';
import * as Notifications from 'expo-notifications';
import FollowListScreen from '../screens/FollowListScreen';
import AdBanner from '../components/AdBanner';

// Define the param list for the SearchStack
type SearchStackParamList = {
  SearchScreen: undefined;
  OtherUserProfile: { userId: string };
  FollowList: { userId: string; type: 'followers' | 'following' };
};

type OtherUserProfileScreenNavigationProp = StackNavigationProp<SearchStackParamList, 'OtherUserProfile'>;
type OtherUserProfileScreenRouteProp = RouteProp<SearchStackParamList, 'OtherUserProfile'>;

type OtherUserProfileScreenProps = {
  navigation: OtherUserProfileScreenNavigationProp;
  route: OtherUserProfileScreenRouteProp;
};

type HomeStackParamList = {
  HomeScreen: undefined;
  CreateRanking: undefined;
  EditRanking: { ranking: SerializableRanking };
  RankingDetail: { rankingId: string };
  Rerank: { originalRanking: SerializableRanking };
  Invite: undefined;
  OtherUserProfile: { userId: string };
  FollowList: { userId: string; type: 'followers' | 'following' };
};

type ProfileStackParamList = {
  ProfileScreen: undefined;
  FollowList: { userId: string; type: 'followers' | 'following' };
  OtherUserProfile: { userId: string };
};

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator<HomeStackParamList>();
const SearchStack = createStackNavigator<SearchStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const NotificationsStack = createStackNavigator();

const screenOptions: StackNavigationOptions = {
  headerStyle: {
    backgroundColor: theme.colors.surface,
    shadowColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface === '#FFFFFF' ? '#E5E5E5' : '#333333',
  },
  headerTintColor: theme.colors.text,
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  headerBackTitleStyle: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  }
};

const SEQUENTIAL_MESSAGES = [
  "hi, im the secret button!",
  "will you find the secret by pressing me more? who knows!",
  "maybe there is no secret! maybe this button is just a waste of my time!",
  "wow! you're still pressing! good for you!",
  "ok man you're kinda wearing this button out, there's a whole app to explore",
  "you should really check out the rest of the app, harry worked really hard on it, its pretty neat",
  "alright whatever dont listen to me, im just a button. who cares what a button thinks"
];

const secrets = [
  "hehe secret button",
  "cant believe you got the secret button",
  "HELP ME IM STUCK IN THE RANKED APP HELP HELP HELP",
  "oooo im the secret button oooooooo ",
  "they turned me into a secret button im da secret button",
  "you shared to 3 people for no reason hahaha",
  "hehehehehe",
  "01100111 01100001 01111001 00001010",
  "its me da secret button",
  "ouch u tapped me too hard that time",
  "oooo you love this app oooo you love it so much",
  "call this number: 804-869-1022, and say 'hey remember when you and harry went to asados on 12/05/2024 and you were like yeah you got it ill venmo you back and harry was like ok no problem and then you never paid him that was messed up.'",
  "Ok here's the scecret: i uh oh i have to go pee pee wait",
  "there's 500 messages, 1 is the real secret",
  "Secret button in da ranked app oh yeah",
  "hey psst... this isn't even the real secret button",
  "button fact #471: clicking makes me feel nice!",
  "ooo i want to give this app a 5 star rating ooo",
  "fun fact #21: the creator of this app is 6 foot 4",
  "fact #93: the creator of this app has big muscles",
  "ploopy",
  "are you some kind of genius? Howd you unlock me?",
  "i get kind of lonely when you dont use the app",
  "you should check up on me more often",
  "SECRET BUTTON!!!!! YEAHHHHHHHHHHHH!!!!!",
  "did i mention the creator of this app is 6 foot 4?",
  "shhhh....... secret button...... shhh....",
  "in my free time, secret button likes to read fine literature",
  "button fact #439: i like da color blue",
  "i used to be a real boy before i was a secret button",
  "i cant believe the creator of this app is 6 foot 4",
  "thanks for clicking on me, it gets lonely when i dont get clicked",
  "does the yellow on this app make it look ugly be honest",
  "sometimes i pretend to be a regular button when no one's looking",
  "secret button fact #482: these messages aren't preloaded... im thinking of these of da dome because im a genius",
  "maybe if you click me enough you'll find the secret.",
  "did you know this app was made by a 13 year old that the creator of the app locked in his basement? he gets 10 minutes of fortnite for every 1000 lines of code written",
  "this button is outsourced to China, there's 20 chinese dudes actively monitoring when you click me and typing these messages up",
  "secret button fact #12: this button is using an LLM, each time you press it it costs us like 0.001 cents.",
  "secret button fact #13: many hours were spent creating this secret button and no one will see this message.", 
  "secret button fact #15: i was almost named greg instead of secret button.",
  "hehehee stooooooppp clicking me that tickles stoppppp hehehehehe",
  "secret button fact #16: if you click me 1000 times, something crazy happens",
  "word on the street is that not only is the creator of this app 6 foot 4, but he's also very charming and handsome and cute and funny and handsome and 6 foot 4",
  "i wish i got a better place on the screen, top left of the screen gets kinda lonely not much happens up here",
  "one day i'll be a normal button, maybe even i'll get to be a tab navigator button. boy will that make me happy.",
  "loo loo loo i have some apples loo loo loo you've got some too",
  "have you found my friend? secret button #2? he's way funnier than me",
  "the search button thinks he's all that but he's really not. he's literally a default magnifying glass icon. what a tool.",
];

const HomeStackScreen = () => {
  const { user } = useCurrentUser();
  const confettiRef = useRef<any>(null);
  const [showMessage, setShowMessage] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [messageIndex, setMessageIndex] = useState<number | null>(null);

  // Load the message index when component mounts
  useEffect(() => {
    const fetchMessageIndex = async () => {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const currentIndex = userDoc.data()?.secretButtonIndex ?? 0;
        setMessageIndex(currentIndex);
      }
    };
    fetchMessageIndex();
  }, [user]);

  const showConfetti = () => {
    if (confettiRef.current) {
      confettiRef.current.startConfetti();
    }
  };

  const showAffirmation = async () => {
    if (!user?.uid || messageIndex === null) return;

    let message;
    if (messageIndex < SEQUENTIAL_MESSAGES.length) {
      // Get the current sequential message
      message = SEQUENTIAL_MESSAGES[messageIndex];
      
      // Update the index in Firebase
      await updateDoc(doc(db, 'users', user.uid), {
        secretButtonIndex: messageIndex + 1
      });
      
      // Update local state
      setMessageIndex(messageIndex + 1);
    } else {
      // Use random message from secrets array
      message = secrets[Math.floor(Math.random() * secrets.length)];
    }
    
    setCurrentMessage(message);
    setShowMessage(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <HomeStack.Navigator 
        screenOptions={{
          ...screenOptions,
          headerStyle: {
            ...(screenOptions.headerStyle as object),
            height: 100,
          },
          headerTitleContainerStyle: {
            paddingBottom: 12,
          }
        }}
      >
        <HomeStack.Screen 
          name="HomeScreen" 
          component={HomeScreen} 
          options={({ navigation }) => ({
            title: 'Home',
            headerRight: () => (
              <TouchableOpacity 
                onPress={() => navigation.navigate('Invite')}
                style={{
                  marginRight: 16,
                  marginBottom: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 6,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 0,
                  borderWidth: 1,
                  borderColor: '#000',
                  position: 'relative',
                }}
              >
                {(!user?.shareCount || user.shareCount < 3) && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 8,
                    height: 8,
                    backgroundColor: '#ff0000',
                    borderWidth: 1,
                    borderColor: '#000',
                  }} />
                )}
                <Text style={{
                  fontSize: 11,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontWeight: 'bold',
                }}>
                  [INVITE]
                </Text>
              </TouchableOpacity>
            ),
            headerLeft: () => {
              if (user?.shareCount && user.shareCount >= 3) {
                return (
                  <TouchableOpacity 
                    onPress={() => {
                      showAffirmation();
                    }}
                    style={{
                      marginLeft: 16,
                      marginBottom: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      backgroundColor: '#f5f5f5',
                      borderRadius: 0,
                      borderWidth: 1,
                      borderColor: '#000',
                    }}
                  >
                    <Text style={{
                      fontSize: 11,
                      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                      fontWeight: 'bold',
                    }}>
                      [SHH...]
                    </Text>
                  </TouchableOpacity>
                );
              }
              return null;
            }
          })}
        />
        <HomeStack.Screen name="CreateRanking" component={CreateRanking} options={{ title: 'Create a Ranking' }} />
        <HomeStack.Screen name="EditRanking" component={EditRanking} options={{ title: 'Edit Ranking' }} />
        <HomeStack.Screen name="RankingDetail" component={RankingDetailScreen} options={{ title: 'Rank' }} />
        <HomeStack.Screen 
          name="Rerank" 
          component={RerankScreen as React.ComponentType<any>} 
          options={{ title: 'Rerank' }} 
        />
        <HomeStack.Screen 
          name="Invite" 
          component={InviteScreen} 
          options={{ 
            title: 'Invite Friends',
            presentation: 'modal' 
          }} 
        />
        <HomeStack.Screen 
          name="OtherUserProfile" 
          component={OtherUserProfileScreen}
          options={{ title: 'User Profile' }} 
        />
        <HomeStack.Screen 
          name="FollowList" 
          component={FollowListScreen}
          options={({ route }) => ({ 
            title: route.params.type === 'followers' ? 'Followers' : 'Following',
            headerShown: true
          })}
        />
      </HomeStack.Navigator>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showMessage}
        onRequestClose={() => setShowMessage(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
          }}
          activeOpacity={1}
          onPress={() => setShowMessage(false)}
        >
          <View 
            style={{
              backgroundColor: '#f5f5f5',
              padding: 20,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: '#000',
              width: '90%',
              maxWidth: 400,
            }}
          >
            <Text 
              style={{
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                fontWeight: 'bold',
                fontSize: 14,
                lineHeight: 20,
                color: '#000',
              }}
            >
              {currentMessage}
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <View 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
        }}
        pointerEvents="none"
      >
        <Confetti 
          ref={(ref) => {
            confettiRef.current = ref;
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />
      </View>
    </View>
  );
};

const SearchStackScreen = () => (
  <SearchStack.Navigator screenOptions={screenOptions}>
    <SearchStack.Screen name="SearchScreen" component={UserSearchScreen} options={{ title: 'Search' }} />
    <SearchStack.Screen 
      name="OtherUserProfile" 
      component={OtherUserProfileScreen}
      options={{ title: 'User Profile' }} 
    />
    <SearchStack.Screen 
      name="FollowList" 
      component={FollowListScreen}
      options={({ route }) => ({ 
        title: route.params.type === 'followers' ? 'Followers' : 'Following'
      })} 
    />
  </SearchStack.Navigator>
);

const ProfileStackScreen = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerTintColor: theme.colors.text,
      headerStyle: {
        backgroundColor: theme.colors.tabBar,
      },
      headerTitleStyle: {
        fontFamily: theme.fonts.default,
      }
    }}
  >
    <ProfileStack.Screen 
      name="ProfileScreen" 
      component={ProfileScreen}
      options={({ navigation, route }) => ({
        headerShown: true,
        headerTitle: '',
        headerTitleStyle: {
          fontFamily: theme.fonts.default,
          fontSize: 18,
          fontWeight: 'bold',
        },
      })}
    />
    <ProfileStack.Screen 
      name="FollowList" 
      component={FollowListScreen}
      options={({ route }) => ({
        title: route.params.type === 'followers' ? 'Followers' : 'Following'
      })}
    />
    <ProfileStack.Screen 
      name="OtherUserProfile" 
      component={OtherUserProfileScreen}
      options={{ 
        title: '',
        headerBackTitle: 'Back'
      }}
    />
  </ProfileStack.Navigator>
);

const NotificationsStackScreen = () => (
  <NotificationsStack.Navigator screenOptions={screenOptions}>
    <NotificationsStack.Screen 
      name="NotificationsScreen" 
      component={NotificationsScreen}
      options={{ title: 'Notifications' }}
    />
  </NotificationsStack.Navigator>
);

// Add type for notification response
type NotificationResponse = {
  notification: {
    request: {
      content: {
        data: {
          rankingId?: string;
          type?: string;
          fromUserId?: string;
        };
      };
    };
  };
};

// Add type for root navigation
type RootStackParamList = {
  RankingDetail: { rankingId: string };
  OtherUserProfile: { userId: string };
};

const TabNavigator = () => {
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const { user } = useCurrentUser();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (!user?.uid) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('toUserId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hasUnread = snapshot.size > 0;
      setHasUnreadNotifications(hasUnread);
    });

    // Set up notification response handler with proper typing
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response: NotificationResponse) => {
        const data = response.notification.request.content.data;
        
        if (data.rankingId) {
          navigation.navigate('RankingDetail', { rankingId: data.rankingId });
        } else if (data.type === 'follow' && data.fromUserId) {
          navigation.navigate('OtherUserProfile', { userId: data.fromUserId });
        }
      }
    );

    return () => {
      unsubscribe();
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, [user?.uid, navigation]);

  return (
    <>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } 
          if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } 
          if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          }
          if (route.name === 'Notifications') {
            return (
              <MaterialIcons 
                name={hasUnreadNotifications ? "notifications-active" : "notifications-none"}
                size={size} 
                color={hasUnreadNotifications ? '#ff4444' : color}
              />
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.surface === '#FFFFFF' ? '#E5E5E5' : '#333333',
          height: Platform.OS === 'ios' ? 88 : 60,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        },
        tabBarLabelStyle: {
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
          fontSize: 10,
          marginTop: -4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen name="Search" component={SearchStackScreen} />
      <Tab.Screen 
        name="Notifications" 
        component={NotificationsStackScreen}
        listeners={{
          tabPress: async () => {
            if (user?.uid) {
              await requestNotificationPermissions(user.uid);
            }
          },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileStackScreen} />
    </Tab.Navigator>
    <AdBanner/>
    </>
  );
};

export default TabNavigator;
