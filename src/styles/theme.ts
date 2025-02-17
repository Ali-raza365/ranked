import { Platform } from 'react-native';

export const theme = {
    colors: {
      primary: '#FFD966',
      secondary: '#4A90E2',
      background: '#F5F5F5',
      surface: '#FFFFFF',
      surfaceHighlight: '#F0F7FF',
      text: '#333333',
      textSecondary: '#757575',
      tabBar: '#FFFFFF',
      tabBarActive: '#FFD966',
      divider: '#E0E0E0',
      shadow: '#000000',
      inputBorder: '#CCCCCC',
      error: '#FF0000',
      buttonText: '#333333',
      disabled: '#CCCCCC',
    },
    fonts: {
      default: 'Inter',
      bold: 'Inter-Bold',
      italic: 'Inter-Italic',
    },
    shadows: {
      small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      },
      medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
      },
    },
  };