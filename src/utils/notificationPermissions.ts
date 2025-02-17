import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const NOTIFICATIONS_PERMISSION_KEY = '@notifications_permission_requested';

export async function requestNotificationPermissions(userId?: string) {
  try {
    // Check if we've already requested permissions
    const hasRequested = await AsyncStorage.getItem(NOTIFICATIONS_PERMISSION_KEY);
    if (hasRequested) {
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // Mark that we've requested permissions
    await AsyncStorage.setItem(NOTIFICATIONS_PERMISSION_KEY, 'true');
    
    if (finalStatus !== 'granted') {
      return null;
    }

    // Get the token
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Set up Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Store the token for the current user
    if (userId) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: token
      });
    }

    return token;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return null;
  }
} 