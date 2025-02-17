import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { MenuOption } from 'react-native-popup-menu';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface ReportButtonProps {
  contentId: string;
  contentType: string;
  reportedUserId: string;
}

export const ReportButton: React.FC<ReportButtonProps> = ({
  contentId,
  contentType,
  reportedUserId,
}) => {
  const { user } = useCurrentUser();

  const submitReport = async (reason: string) => {
    try {
      if (!user) return;

      await addDoc(collection(db, 'reports'), {
        contentId,
        contentType,
        reportedUserId,
        reporterId: user.uid,
        reporterEmail: user.email,
        reason,
        status: 'pending', // pending, reviewed, resolved, dismissed
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep the community safe. We will review this content.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report Content',
      'Why are you reporting this content?',
      [
        {
          text: 'Inappropriate Content',
          onPress: () => submitReport('inappropriate'),
        },
        {
          text: 'Harassment or Bullying',
          onPress: () => submitReport('harassment'),
        },
        {
          text: 'Spam or Misleading',
          onPress: () => submitReport('spam'),
        },
        {
          text: 'Hate Speech',
          onPress: () => submitReport('hate_speech'),
        },
        {
          text: 'Other',
          onPress: () => submitReport('other'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <MenuOption onSelect={handleReport}>
      <View style={styles.menuOption}>
        <MaterialIcons name="flag" size={20} color="#666" />
        <Text style={styles.menuOptionText}>Report</Text>
      </View>
    </MenuOption>
  );
};

const styles = StyleSheet.create({
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  menuOptionText: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: theme.fonts.default,
  },
}); 