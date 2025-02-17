import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = () => (
  <SafeAreaView style={styles.container}>
    <Text style={styles.title}>Ranked</Text>
    <View style={styles.feedContainer}>
      <Text style={styles.noRanksText}>No ranks yet :(</Text>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  feedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noRanksText: {
    fontSize: 18,
    color: 'gray',
  },
});

export default HomeScreen;
