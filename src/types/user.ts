import { User as FirebaseUser } from 'firebase/auth';

export interface User extends FirebaseUser {
  followers: string[];
  following: string[];
  followerCount: number;
  followingCount: number;
  displayName: string;
  displayNameLower: string;
  fullName?: string;
  shareCount?: number;
  acceptedTerms: boolean;
  acceptedTermsDate?: string;
  badWordsMode: boolean;
  blockedUsers: string[];
  isHater?: boolean;
  easterEggNickname?: string | null;
}
