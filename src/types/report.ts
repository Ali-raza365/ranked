export interface Report {
  id: string;
  reportedBy: string;
  reportedUserId: string;
  contentId: string;
  contentType: 'ranking' | 'comment';
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  timestamp: string;
} 