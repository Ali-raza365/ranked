import { collection, addDoc, updateDoc, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { NotificationType } from '../types/notification';

export const createNotification = async (
  type: NotificationType,
  fromUserId: string,
  fromUsername: string,
  toUserId: string,
  data: {
    rankingId?: string;
    rankingTitle?: string;
    reaction?: string;
    commentText?: string;
  }
) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      type,
      fromUserId,
      fromUsername,
      toUserId,
      read: false,
      createdAt: new Date(),
      ...data
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

export const deleteNotification = async (notificationId: string) => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
}; 