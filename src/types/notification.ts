import { Timestamp } from 'firebase/firestore';

export type NotificationType = 'reaction' | 'comment' | 'follow' | 'rerank' | 'mention' | 'new_ranking';

export interface Notification {
  id: string;
  type: NotificationType;
  fromUserId: string;
  fromUsername: string;
  toUserId: string;
  read: boolean;
  createdAt: Date;
  rankingId?: string;
  rankingTitle?: string;
  reaction?: string;
  commentText?: string;
} 