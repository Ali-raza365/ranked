import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform, ShareContent, Animated, Dimensions } from 'react-native';
import { doc, increment, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { theme } from '../styles/theme';
import Confetti from 'react-native-confetti';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MESSAGES = [
  "you love this app",
  "you want to share this app with all of your friends",
  "this is your favorite app in the world",
  "you can't stop thinking about Ranked",
  "sharing is caring",
  "your friends need this app in their lives",
  "you've never seen an app this good",
  "ranking things brings you joy",
  "you want everyone to experience this app",
  "this app completes you",
  "for lunch today i had chicken" // Easter egg message
];

const SubliminalMessage: React.FC<{ message: string }> = ({ message }) => {
  const position = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [randomTop, setRandomTop] = useState(
    Math.random() * Dimensions.get('window').height
  );

  useEffect(() => {
    const startAnimation = () => {
      position.setValue(SCREEN_WIDTH);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(position, {
          toValue: -SCREEN_WIDTH,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Re-trigger animation after a random delay
        const nextDelay = Math.random() * 3000 + 2000; // Between 2-5 seconds
        setTimeout(() => startAnimation(), nextDelay);
      });
    };

    const initialDelay = Math.random() * 5000; // Random first appearance delay (0-5 seconds)
    setTimeout(() => startAnimation(), initialDelay);

    return () => {
      position.stopAnimation();
      opacity.stopAnimation();
    };
  }, []);

  return (
    <Animated.Text
      style={[
        styles.subliminalText,
        {
          transform: [{ translateX: position }],
          opacity: opacity,
          top: randomTop,
        },
      ]}
    >
      {message}
    </Animated.Text>
  );
};



const InviteScreen: React.FC = () => {
  const { user } = useCurrentUser();
  const [shareCount, setShareCount] = useState(0);
  const confettiRef = React.useRef<any>(null);

  useEffect(() => {
    loadShareCount();
  }, [user]);

  const loadShareCount = async () => {
    if (!user) return;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    setShareCount(userDoc.data()?.shareCount || 0);
  };

  const handleShare = async () => {
    try {
      const shareUrl = 'https://apps.apple.com/us/app/ranked-social/id6739509137';
      
      const shareOptions: ShareContent = Platform.select({
        ios: {
          message: "This new app where you rank things is SO AWESOME!!!",
          url: shareUrl,
          title: 'Join me on Ranked!'
        },
        android: {
          message: `This new app where you rank things is so cool! That is my genuine honest opinion! 👀 ${shareUrl}`,
          title: 'Join me on Ranked!'
        }
      }) || {
        message: `I'm obsessed with this new app called Ranked! Join me and see what I've been ranking 👀 ${shareUrl}`,
        title: 'Join me on Ranked!'
      };

      const result = await Share.share(shareOptions);

      if (result.action === Share.sharedAction) {
        if (user) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            shareCount: increment(1)
          });
          setShareCount(prev => prev + 1);

          if (shareCount + 1 >= 3 && confettiRef.current) {
            confettiRef.current.startConfetti();
          }
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.subliminalContainer}>
      {MESSAGES.map((message, index) => (
        <SubliminalMessage key={index} message={message} />
      ))}
    </View>


      <Confetti 
        ref={(ref) => {
          confettiRef.current = ref;
        }}
      />
      
      <View style={styles.giftImage}>
        <Ionicons 
          name="gift" 
          size={80} 
          color={theme.colors.primary}
        />
      </View>

      <Text style={styles.title}>
        Invite 3 friends, win a{'\n'}
        <Text style={styles.highlight}>SUPER SECRET AMAZING{'\n'}AWESOME PRIZE</Text> 
      </Text>
      <Text style={styles.subtitle}>
        (you are the only user being offered this super secret exclusive prize, keep this between us...)
      </Text>

      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          {shareCount}/3 friends invited
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: `${(shareCount / 3) * 100}%` }]} />
        </View>
      </View>

      <Text style={styles.shareTitle}>
        Share your link to earn the prize:
      </Text>

      <TouchableOpacity 
        style={styles.shareButton} 
        onPress={handleShare}
      >
        <Text style={styles.shareButtonText}>Share with Friends</Text>
      </TouchableOpacity>

      {shareCount >= 3 && (
        <Text style={styles.congratsText}>
          You earned the prize... find it in the app
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
    alignItems: 'center',
  },
  giftImage: {
    width: 120,
    height: 120,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: theme.fonts.default,
    lineHeight: 32,
  },
  highlight: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 32,
  },
  progressText: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: theme.fonts.default,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  shareTitle: {
    fontSize: 18,
    marginBottom: 16,
    fontFamily: theme.fonts.default,
  },
  shareButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    ...theme.shadows.medium,
  },
  shareButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.buttonText,
    fontFamily: theme.fonts.default,
  },
  congratsText: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    fontFamily: theme.fonts.default,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontFamily: theme.fonts.default,
    fontStyle: 'italic',
    marginTop: -16,
    marginBottom: 24,
  },
  subliminalContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  subliminalText: {
    position: 'absolute',
    fontSize: 16,
    color: 'rgba(0, 0, 0, 0.1)', // Even more visible
    fontFamily: theme.fonts.default,
    fontWeight: 'bold',
  },
});

export default InviteScreen; 