import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Dimensions, Platform, Easing } from 'react-native';

const ITEM_HEIGHT = 40;
const NUM_ITEMS = 300;

const RankedBackground = () => {
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(scrollY, {
        toValue: -ITEM_HEIGHT * NUM_ITEMS,
        duration: 300000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    return () => scrollY.stopAnimation();
  }, []);

  return (
    <View style={styles.container}>
      {Array.from({ length: NUM_ITEMS }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.row,
            {
              transform: [{ translateY: scrollY }],
            },
          ]}
          removeClippedSubviews={true}
          renderToHardwareTextureAndroid={true}
        >
          <Animated.Text
            style={styles.text}
            numberOfLines={1}
          >
            {(i + 1) + ". " + ((i + 1) === 69 ? "hehe" : "ranked")}
          </Animated.Text>
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f5f5f5',
  },
  row: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  text: {
    fontSize: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#cccccc',
    fontWeight: '600',
  },
});

export default RankedBackground; 