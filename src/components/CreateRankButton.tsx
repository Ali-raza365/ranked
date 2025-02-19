import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface CreateRankButtonProps {
  onPress: () => void;
}

const CreateRankButton: React.FC<CreateRankButtonProps> = ({ onPress }) => (
  <TouchableOpacity style={styles.createRankButton} onPress={onPress}>
    <Ionicons name="add" size={30} color={theme.colors.text} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  createRankButton: {
    position: 'absolute',
    bottom: 20,
    right: 15,
    backgroundColor: theme.colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.medium,
  },
  buttonText: {
    color: theme.colors.text, 
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: theme.fonts.default,
  },
});

export default CreateRankButton;
