import { doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc, collection, setDoc, addDoc, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Reaction, Comment, Ranking } from '../types/ranking';
import { Notification, NotificationType } from '../types/notification';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Comment out this entire function as it's only for push notifications
/*
async function registerForPushNotificationsAsync() {
  let token;
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return null;
  }

  token = (await Notifications.getExpoPushTokenAsync()).data;
  
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
}
*/

export const followUser = async (currentUserId: string, targetUserId: string) => {
  try {
    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);

    // Get current user's username
    const currentUserDoc = await getDoc(currentUserRef);
    const currentUsername = currentUserDoc.data()?.displayName || 'Anonymous';

    await updateDoc(currentUserRef, {
      following: arrayUnion(targetUserId),
      followingCount: increment(1)
    });

    await updateDoc(targetUserRef, {
      followers: arrayUnion(currentUserId),
      followerCount: increment(1)
    });

    // Create follow notification - sending TO the target user
    await createNotification(
      'follow',
      currentUserId,    // from: the person doing the following
      currentUsername,  // username of the follower
      targetUserId,     // to: the person being followed
      {}
    );
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

export const unfollowUser = async (currentUserId: string, targetUserId: string) => {
  try {
    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);

    // Get current user's username
    const currentUserDoc = await getDoc(currentUserRef);
    const currentUsername = currentUserDoc.data()?.displayName || 'Anonymous';

    await updateDoc(currentUserRef, {
      following: arrayRemove(targetUserId),
      followingCount: increment(-1)
    });

    await updateDoc(targetUserRef, {
      followers: arrayRemove(currentUserId),
      followerCount: increment(-1)
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
};

export const reactToRanking = async (userId: string, rankingId: string, reaction: Reaction) => {
  try {
    const rankingRef = doc(db, 'rankings', rankingId);
    const rankingDoc = await getDoc(rankingRef);

    if (!rankingDoc.exists()) {
      console.error('Ranking document does not exist');
      return;
    }

    const rankingData = rankingDoc.data();
    if (!rankingData.reactions) {
      rankingData.reactions = { ':D': [], ':0': [], ':(': [], '>:(': [] };
    }

    // Get user's display name
    const userDoc = await getDoc(doc(db, 'users', userId));
    const username = userDoc.data()?.displayName || 'Anonymous';

    // Create notification for the ranking owner
    if (userId !== rankingData.userId) {
      await createNotification(
        'reaction',
        userId,        // from the reactor
        username,      // reactor's username
        rankingData.userId,  // to the ranking owner
        {
          rankingId: rankingId,
          rankingTitle: rankingData.title,
          reaction: reaction
        }
      );
    }

    // Remove user from all reaction arrays
    const updateObject: { [key: string]: any } = {};
    Object.keys(rankingData.reactions).forEach((key) => {
      updateObject[`reactions.${key}`] = arrayRemove(userId);
    });

    // Add user to the selected reaction array
    updateObject[`reactions.${reaction}`] = arrayUnion(userId);

    await updateDoc(rankingRef, updateObject);
  } catch (error) {
    console.error('Error in reactToRanking:', error);
  }
};

export const addCommentToRanking = async (
  userId: string, 
  rankingId: string, 
  content: string,
  parentCommentId?: string | null
) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const username = userDoc.data().displayName || 'Anonymous';
    const rankingRef = doc(db, 'rankings', rankingId);
    const rankingDoc = await getDoc(rankingRef);
    const rankingData = rankingDoc.data();

    const comment: Comment = {
      id: Date.now().toString(),
      userId,
      username,
      content: content.trim(),
      createdAt: new Date(),
      ...(parentCommentId ? { parentCommentId } : {}),
      replies: []
    };

    await updateDoc(rankingRef, {
      comments: arrayUnion(comment),
    });

    // If this is a reply to another comment, create a notification
    if (parentCommentId && rankingData) {
      const parentComment = rankingData.comments.find(
        (c: Comment) => c.id === parentCommentId
      );

      if (parentComment && parentComment.userId !== userId) {
        // Create notification using your existing infrastructure
        await createNotification(
          'comment',  // Using existing comment type
          userId,     // from: person replying
          username,   // username of replier
          parentComment.userId,  // to: original commenter
          {
            rankingId,
            rankingTitle: rankingData.title,
            commentText: `replied: ${content.trim()}`  // Prefix with 'replied:' to distinguish it
          }
        );
      }
    }

    return comment;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const deleteCommentFromRanking = async (rankingId: string, commentId: string) => {
  try {
    const rankingRef = doc(db, 'rankings', rankingId);
    const rankingDoc = await getDoc(rankingRef);

    if (!rankingDoc.exists()) {
      throw new Error('Ranking not found');
    }

    const updatedComments = rankingDoc.data().comments.filter((comment: Comment) => comment.id !== commentId);

    await updateDoc(rankingRef, {
      comments: updatedComments,
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export const createRerankNotification = async (
  userId: string,
  originalRankingId: string,
  originalUserId: string,
  rankingTitle: string
) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const username = userDoc.data()?.displayName || 'Anonymous';

    // Don't create notification if user is reranking their own post
    if (userId !== originalUserId) {
      await createNotification(
        'rerank',
        userId,
        username,
        originalUserId,
        {
          rankingId: originalRankingId,
          rankingTitle: rankingTitle
        }
      );
    }
  } catch (error) {
    console.error('Error creating rerank notification:', error);
  }
};

export const submitRerank = async (
  userId: string,
  originalRankingId: string,
  newRanking: Partial<Ranking>
) => {
  try {
    // Get the user's info
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    const username = userDoc.data().displayName || 'Anonymous';

    // Get the original ranking
    const originalRankingRef = doc(db, 'rankings', originalRankingId);
    const originalRankingDoc = await getDoc(originalRankingRef);
    const originalRankingData = originalRankingDoc.data();

    // Create the rerank document
    const rerankRef = doc(collection(db, 'reranks'));
    await setDoc(rerankRef, {
      ...newRanking,
      originalRankingId,
      userId,
      username,
      createdAt: new Date(),
    });

    // Create notification for the original ranking owner
    if (userId !== originalRankingData?.userId) {
      await createNotification(
        'rerank',
        userId,
        username,
        originalRankingData?.userId,
        {
          rankingId: originalRankingId,
          rankingTitle: originalRankingData?.title
        }
      );
    }

    return rerankRef.id;
  } catch (error) {
    console.error('Error submitting rerank:', error);
    throw error;
  }
};

export const createNotification = async (
  type: NotificationType,
  fromUserId: string,
  fromUsername: string,
  toUserId: string,
  additionalData?: {
    rankingId?: string;
    rankingTitle?: string;
    reaction?: string;
    commentText?: string;
  }
) => {
  try {
    if (fromUserId === toUserId) return;

    // Create the in-app notification
    const notificationsRef = collection(db, 'notifications');
    const notification: Omit<Notification, 'id'> = {
      type,
      fromUserId,
      fromUsername,
      toUserId,
      read: false,
      createdAt: new Date(),
      ...additionalData
    };

    await addDoc(notificationsRef, notification);

    // Get the target user's push token
    const targetUserDoc = await getDoc(doc(db, 'users', toUserId));
    const targetUserPushToken = targetUserDoc.data()?.pushToken;

    if (!targetUserPushToken) return;

    // Get notification message
    let message = '';
    switch (type) {
      case 'reaction':
        message = `${fromUsername} reacted ${additionalData?.reaction} to your rank "${additionalData?.rankingTitle}"`;
        break;
      case 'comment':
        message = `${fromUsername} commented on your rank "${additionalData?.rankingTitle}"`;
        break;
      case 'follow':
        message = `${fromUsername} started following you`;
        break;
      case 'rerank':
        message = `${fromUsername} reranked your rank "${additionalData?.rankingTitle}"`;
        break;
      case 'mention':
        message = `${fromUsername} mentioned you in a comment`;
        break;
      case 'new_ranking':
        message = `${fromUsername} created a new ranking: "${additionalData?.rankingTitle}"`;
        break;
    }

    // Send push notification using Expo's push service
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: targetUserPushToken,
        title: 'Ranked',
        body: message,
        data: { 
          type,
          fromUserId,
          ...additionalData 
        },
      }),
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

export const notifyFollowersOfNewRanking = async (
  creatorId: string,
  creatorUsername: string,
  rankingId: string,
  rankingTitle: string
) => {
  try {
    // Get the creator's document to access their followers
    const creatorDoc = await getDoc(doc(db, 'users', creatorId));
    const followers = creatorDoc.data()?.followers || [];

    // For each follower, create a notification
    const followerPromises = followers.map(async (followerId: string) => {
      // Skip if the follower is the creator
      if (followerId === creatorId) {
        return;
      }

      // Create in-app notification
      await createNotification(
        'new_ranking',
        creatorId,
        creatorUsername,
        followerId,
        {
          rankingId,
          rankingTitle
        }
      );
    });

    await Promise.all(followerPromises);
  } catch (error) {
    console.error('Error notifying followers:', error);
  }
};

export const cleanupFollowerCounts = async () => {
  try {
    const usersRef = collection(db, 'users');
    const userDocs = await getDocs(usersRef);
    const batch = writeBatch(db);
    
    for (const userDoc of userDocs.docs) {
      const userData = userDoc.data();
      const followers = userData.followers || [];
      const following = userData.following || [];
      
      // Check if each follower still exists
      const validFollowers = await Promise.all(
        followers.map(async (followerId: string) => {
          const followerDoc = await getDoc(doc(db, 'users', followerId));
          return followerDoc.exists();
        })
      );
      
      // Check if each following user still exists
      const validFollowing = await Promise.all(
        following.map(async (followingId: string) => {
          const followingDoc = await getDoc(doc(db, 'users', followingId));
          return followingDoc.exists();
        })
      );
      
      // Filter out non-existent users
      const newFollowers = followers.filter((_: string, index: number) => validFollowers[index]);
      const newFollowing = following.filter((_: string, index: number) => validFollowing[index]);
      
      // Update counts and arrays if they've changed
      if (newFollowers.length !== followers.length || newFollowing.length !== following.length) {
        batch.update(userDoc.ref, {
          followers: newFollowers,
          following: newFollowing,
          followerCount: newFollowers.length,
          followingCount: newFollowing.length
        });
      }
    }
    
    await batch.commit();
    console.log('Follower counts cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up follower counts:', error);
  }
};

export const deleteUserAccount = async (userId: string) => {
  try {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);
    
    // Get the user's data first
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const followers = userData.followers || [];
    const following = userData.following || [];

    // Update all followers' following lists
    for (const followerId of followers) {
      const followerRef = doc(db, 'users', followerId);
      batch.update(followerRef, {
        following: arrayRemove(userId),
        followingCount: increment(-1)
      });
    }

    // Update all following users' followers lists
    for (const followingId of following) {
      const followingRef = doc(db, 'users', followingId);
      batch.update(followingRef, {
        followers: arrayRemove(userId),
        followerCount: increment(-1)
      });
    }

    // Delete user's notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId)
    );
    const fromNotificationsQuery = query(
      collection(db, 'notifications'),
      where('fromUserId', '==', userId)
    );

    const [notifications, fromNotifications] = await Promise.all([
      getDocs(notificationsQuery),
      getDocs(fromNotificationsQuery)
    ]);

    notifications.forEach(doc => batch.delete(doc.ref));
    fromNotifications.forEach(doc => batch.delete(doc.ref));

    // Delete user's rankings
    const rankingsQuery = query(
      collection(db, 'rankings'),
      where('userId', '==', userId)
    );
    const rankings = await getDocs(rankingsQuery);
    rankings.forEach(doc => batch.delete(doc.ref));

    // Finally, delete the user document
    batch.delete(userRef);

    // Commit all changes
    await batch.commit();

    console.log('User account and related data deleted successfully');
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};
