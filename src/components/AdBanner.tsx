import React, { useState, useRef, useEffect } from "react";
import { Platform, View, Keyboard } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
  useForeground,
} from "react-native-google-mobile-ads";

const adUnitId = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.OS === "ios"
  ? "ca-app-pub-3647461067575621/8766888672" // Use actual iOS Ad Unit ID
  : "ca-app-pub-3647461067575621/4778977558";

function AdBanner() {
  const bannerRef = useRef<BannerAd>(null);
  useForeground(() => {
    Platform.OS === "ios" && bannerRef.current?.load();
  });

  return (
    // !isKeyboardVisible && (
    <View style={{}}>
      <BannerAd
        ref={bannerRef}
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      />
    </View>
    // )
  );
}

export default AdBanner;
