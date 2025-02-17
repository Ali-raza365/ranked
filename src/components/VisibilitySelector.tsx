import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RankingVisibility } from '../types/ranking';
import { theme } from '../styles/theme';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialIcons as MaterialIconsType } from '@expo/vector-icons/build/Icons';

interface VisibilitySelectorProps {
  selectedVisibility: RankingVisibility;
  onSelect: (visibility: RankingVisibility) => void;
}

const VisibilitySelector: React.FC<VisibilitySelectorProps> = ({
  selectedVisibility,
  onSelect,
}) => {
  const options: { value: RankingVisibility; label: string; icon: keyof typeof MaterialIconsType.glyphMap }[] = [
    { value: 'global', label: 'Global', icon: 'public' },
    { value: 'friends', label: 'Friends', icon: 'people' },
    { value: 'private', label: 'Private', icon: 'lock' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.toggleButton,
              selectedVisibility === option.value && styles.toggleButtonSelected,
              option.value === 'global' && styles.toggleButtonFirst,
              option.value === 'private' && styles.toggleButtonLast,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <MaterialIcons
              name={option.icon}
              size={14}
              color={selectedVisibility === option.value ? theme.colors.buttonText : theme.colors.text}
              style={styles.icon}
            />
            <Text
              style={[
                styles.toggleText,
                selectedVisibility === option.value && styles.toggleTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: theme.colors.inputBorder,
  },
  toggleButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  toggleButtonFirst: {
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  toggleButtonLast: {
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    borderRightWidth: 0,
  },
  icon: {
    marginRight: 3,
  },
  toggleText: {
    color: theme.colors.text,
    fontSize: 11,
    fontFamily: theme.fonts.default,
  },
  toggleTextSelected: {
    color: theme.colors.buttonText,
    fontWeight: '600',
  },
});

export default VisibilitySelector; 