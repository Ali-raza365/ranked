import { Timestamp } from 'firebase/firestore';

export const formatTimestamp = (date: Date | Timestamp): string => {
  const dateObject = date instanceof Timestamp ? date.toDate() : date;
  const now = new Date();
  const diffInMinutes = (now.getTime() - dateObject.getTime()) / (1000 * 60);
  
  if (diffInMinutes < 60) {
    const minutes = Math.floor(diffInMinutes);
    return `${minutes}min ago`;
  } else if (diffInMinutes < 24 * 60) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours}hr ago`;
  } else {
    return dateObject.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
  }
};
