import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../styles/theme';
import { requestNotificationPermissions } from '../utils/notificationPermissions';

type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Terms: undefined;
};

type TermsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Terms'>;

type Props = {
  navigation: TermsScreenNavigationProp;
};

export const TermsScreen: React.FC = () => {
  const { user } = useCurrentUser();

  const handleAcceptTerms = async () => {
    if (!user?.uid) return;

    try {
      // Update user's terms acceptance
      await updateDoc(doc(db, 'users', user.uid), {
        acceptedTerms: true,
        acceptedTermsDate: new Date().toISOString(),
      });

      // After they accept terms, request notification permissions
      await requestNotificationPermissions(user.uid);
      
    } catch (error) {
      console.error('Error accepting terms:', error);
    }
  };

  const terms = [
    'Not post any objectionable, offensive, or inappropriate content',
    'Not harass or abuse other users',
    'Not post any illegal content',
    'Understand that reported content will be reviewed',
    'Accept that violation may result in account termination'
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.termsContainer}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>By using Ranked, you agree to:</Text>
        
        {terms.map((term, index) => (
          <View key={index} style={styles.termItem}>
            <Text style={styles.termNumber}>{index + 1}.</Text>
            <Text style={styles.termText}>{term}</Text>
          </View>
        ))}

        <Text style={styles.disclaimer}>
          We reserve the right to remove any content and suspend accounts that violate these terms.
        </Text>
      </ScrollView>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleAcceptTerms}
      >
        <Text style={styles.buttonText}>[ACCEPT]</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  termsContainer: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    fontFamily: theme.fonts.default,
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    fontFamily: theme.fonts.default,
    color: theme.colors.text,
  },
  termItem: {
    flexDirection: 'row',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  termNumber: {
    width: 25,
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: theme.colors.text,
  },
  termText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: theme.colors.text,
  },
  disclaimer: {
    marginTop: 20,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: theme.colors.textSecondary,
    paddingHorizontal: 20,
  },
  button: {
    margin: 20,
    padding: 15,
    backgroundColor: theme.colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: theme.colors.text,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
}); 