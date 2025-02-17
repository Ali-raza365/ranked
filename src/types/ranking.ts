import { Timestamp } from 'firebase/firestore';

export interface Comment {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: Date;
  parentCommentId?: string;
  replies?: Comment[];
}

export type RankingVisibility = 'global' | 'friends' | 'private';

export interface Ranking {
  id: string;
  title: string;
  items: RankingItem[];
  createdAt: Date | Timestamp;
  userId: string;
  userEmail: string;
  username: string;
  reactions: {
    [key in Reaction]: string[];
  };
  comments: Comment[];
  isRerank: boolean;
  originalRankingId?: string;
  originalUsername?: string;
  visibility: RankingVisibility;
}

// Add a new type for serializable ranking
export interface SerializableRanking extends Omit<Ranking, 'createdAt'> {
  createdAt: string;
  isRerank: boolean;
  originalRankingId?: string; 
  originalUsername?: string;
  visibility: RankingVisibility;
}

export interface RankingItem {
  id: string;
  content: string;
}

export type Reaction = ':D' | ':0' | ':(' | '>:(';
