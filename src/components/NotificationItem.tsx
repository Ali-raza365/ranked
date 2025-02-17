import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Notification } from '../types/notification';
import { theme } from '../styles/theme';
import { formatTimestamp } from '../utils/dateFormatters';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Define the navigation param list
type RootStackParamList = {
  RankingDetail: { rankingId: string };
  OtherUserProfile: { userId: string };
};

interface NotificationItemProps {
  notification: Notification;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification }) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const markAsRead = async () => {
    if (!notification.read) {
      const notificationRef = doc(db, 'notifications', notification.id);
      await updateDoc(notificationRef, {
        read: true
      });
    }
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'reaction':
        return 'emoticon-happy-outline';
      case 'comment':
        return 'comment-outline';
      case 'follow':
        return 'account-plus-outline';
      case 'rerank':
        return 'swap-vertical';
      case 'mention':
        return 'at';
      default:
        return 'bell-outline';
    }
  };

  const getNotificationText = () => {
    switch (notification.type) {
      case 'reaction':
        return `@${notification.fromUsername} reacted ${notification.reaction} to your rank "${notification.rankingTitle}"`;
      case 'comment':
        if (notification.commentText?.startsWith('replied:')) {
          return `@${notification.fromUsername} replied to your comment on "${notification.rankingTitle}"`;
        }
        return `@${notification.fromUsername} commented on your rank "${notification.rankingTitle}"`;
      case 'follow':
        return `@${notification.fromUsername} started following you`;
      case 'rerank':
        return `@${notification.fromUsername} reranked your rank "${notification.rankingTitle}"`;
      case 'mention':
        return `@${notification.fromUsername} mentioned you in a comment`;
      case 'new_ranking':
        return `@${notification.fromUsername} created a new ranking: "${notification.rankingTitle}"`;
      default:
        return 'New notification';
    }
  };

  const handlePress = () => {
    markAsRead();
    if (notification.rankingId) {
      navigation.navigate('RankingDetail', { rankingId: notification.rankingId });
    } else if (notification.type === 'follow') {
      navigation.navigate('OtherUserProfile', { userId: notification.fromUserId });
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, !notification.read && styles.unread]} 
      onPress={handlePress}
    >
      <MaterialCommunityIcons 
        name={getNotificationIcon()} 
        size={24} 
        color={theme.colors.primary} 
      />
      <View style={styles.content}>
        <Text style={styles.text}>{getNotificationText()}</Text>
        <Text style={styles.timestamp}>
          {formatTimestamp(notification.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  unread: {
    backgroundColor: '#E8F0FE',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  text: {
    fontSize: 14,
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontFamily: theme.fonts.default,
  },
});

export default NotificationItem; 