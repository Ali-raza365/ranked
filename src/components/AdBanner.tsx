import React, { useState, useRef, useEffect } from 'react';
import { Platform, View, Keyboard } from 'react-native';
import { BannerAd, BannerAdSize, TestIds, useForeground } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-3647461067575621/4778977558';

function AdBanner() {
  const bannerRef = useRef<BannerAd>(null);
  // const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // useEffect(() => {
  //   const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
  //   const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

  //   return () => {
  //     showSubscription.remove();
  //     hideSubscription.remove();
  //   };
  // }, []);

  useForeground(() => {
    Platform.OS === 'ios' && bannerRef.current?.load();
  });

  return (
    // !isKeyboardVisible && (
      <View style={{ }}>
        <BannerAd ref={bannerRef} unitId={adUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
      </View>
    // )
  );
}

export default AdBanner;
