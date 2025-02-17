import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text, TouchableOpacity } from 'react-native';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Notification } from '../types/notification';
import NotificationItem from '../components/NotificationItem';
import { theme } from '../styles/theme';
import LoadingScreen from '../components/LoadingScreen';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';


const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useCurrentUser();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const isFocused = useIsFocused();
  
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Notifications',
      headerTitleStyle: {
        fontFamily: theme.fonts.default,
        fontSize: 18,
        fontWeight: 'bold',
      },
    });
  }, [navigation]);

  useEffect(() => {
    const userId = user?.uid;
    
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let isSubscribed = true;
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('toUserId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!isSubscribed) return;
      
      const newNotifications = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp 
            ? data.createdAt.toDate() 
            : new Date(data.createdAt)
        };
      }) as Notification[];
      
      setNotifications(newNotifications);
      setIsLoading(false);
      setIsRefreshing(false);
    }, (error) => {
      console.error('NotificationsScreen: Error in snapshot listener:', error);
      if (isSubscribed) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [user?.uid]);

  const refreshNotifications = useCallback(() => {
    setIsRefreshing(true);
    // Force a refresh by temporarily unsetting and resetting the listener
    const userId = user?.uid;
    if (!userId) {
      setIsRefreshing(false);
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('toUserId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    // Get fresh data
    getDocs(q).then((snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      setNotifications(newNotifications);
      setIsRefreshing(false);
    }).catch((error) => {
      console.error('Error refreshing notifications:', error);
      setIsRefreshing(false);
    });
  }, [user?.uid]);

  // Mark notifications as read when screen is focused
  useEffect(() => {
    if (isFocused && user?.uid) {
      const markAllAsRead = async () => {
        const notificationsRef = collection(db, 'notifications');
        const q = query(
          notificationsRef,
          where('toUserId', '==', user.uid),
          where('read', '==', false)
        );

        const unreadDocs = await getDocs(q);
        
        if (!unreadDocs.empty) {
          const batch = writeBatch(db);
          unreadDocs.docs.forEach((doc) => {
            batch.update(doc.ref, { read: true });
          });
          await batch.commit();
        }
      };

      markAllAsRead();
    }
  }, [isFocused, user?.uid]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <LoadingScreen />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={({ item }) => <NotificationItem notification={item} />}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshNotifications}
              tintColor={theme.colors.primary}
            />
          }
        />
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
    backgroundColor: theme.colors.background,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.default,
  }
});

export default NotificationsScreen; 