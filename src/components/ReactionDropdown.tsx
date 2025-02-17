import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Reaction } from '../types/ranking';
import { theme } from '../styles/theme';

interface ReactionDropdownProps {
  onReact: (reaction: Reaction) => void;
}

const ReactionDropdown: React.FC<ReactionDropdownProps> = ({ onReact }) => {
  const reactions: Reaction[] = [':D', ':0', ':(', '>:('];

  return (
    <View style={styles.container}>
      {reactions.map((reaction) => (
        <TouchableOpacity
          key={reaction}
          style={styles.reactionButton}
          onPress={() => onReact(reaction)}
        >
          <Text style={styles.reactionText}>{reaction}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reactionButton: {
    padding: 8,
  },
  reactionText: {
    fontSize: 20,
    fontFamily: theme.fonts.default,
  },
});

export default ReactionDropdown;
