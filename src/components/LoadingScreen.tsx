import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { theme } from '../styles/theme';

const { width, height } = Dimensions.get('window');
const NUM_TEXTS = 20; // Number of "Ranked" texts to show

interface TextPosition {
  left: number;
  top: number;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: number;
}

const LoadingScreen: React.FC = () => {
  const [positions, setPositions] = useState<TextPosition[]>([]);

  useEffect(() => {
    const newPositions = Array.from({ length: NUM_TEXTS }, () => ({
      left: Math.random() * (width - 100),
      top: Math.random() * (height - 100),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
      rotation: Math.random() * 360,
    }));

    setPositions(newPositions);

    // Animate each text
    newPositions.forEach((pos, index) => {
      Animated.sequence([
        Animated.delay(index * 100), // Stagger the animations
        Animated.parallel([
          Animated.spring(pos.opacity, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.spring(pos.scale, {
            toValue: 1,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, []);

  return (
    <View style={styles.container}>
      {positions.map((pos, index) => (
        <Animated.Text
          key={index}
          style={[
            styles.text,
            {
              left: pos.left,
              top: pos.top,
              opacity: pos.opacity,
              transform: [
                { scale: pos.scale },
                { rotate: `${pos.rotation}deg` },
              ],
            },
          ]}
        >
          Ranked
        </Animated.Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  text: {
    position: 'absolute',
    color: '#000000',
    fontSize: 24,
    fontFamily: theme.fonts.default,
    fontWeight: 'bold',
  },
});

export default LoadingScreen;