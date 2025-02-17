import React, { useState, useCallback } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Ranking, RankingItem, SerializableRanking, RankingVisibility } from '../types/ranking';
import { theme } from '../styles/theme';
import DraggableFlatList, { 
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import VisibilitySelector from '../components/VisibilitySelector';
import { createNotification } from '../firebase/userFunctions';

type RootStackParamList = {
  Rerank: { originalRanking: SerializableRanking };
};

type RerankScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Rerank'>;
type RerankScreenRouteProp = RouteProp<RootStackParamList, 'Rerank'>;

type Props = {
  navigation: RerankScreenNavigationProp;
  route: RerankScreenRouteProp;
};

const RerankScreen: React.FC<Props> = ({ route, navigation }) => {
  const { originalRanking } = route.params;
  const [items, setItems] = useState<RankingItem[]>(originalRanking.items);
  const [visibility, setVisibility] = useState<RankingVisibility>('global');
  const { user } = useCurrentUser();

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<RankingItem>) => {
    const index = getIndex();
    
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={150}
          style={styles.itemWrapper}
          disabled={isActive}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemNumber}>{(index ?? 0) + 1}.</Text>
            <Text style={styles.itemText} numberOfLines={1}>{item.content}</Text>
            <MaterialIcons 
              name="drag-handle" 
              size={24} 
              color={isActive ? theme.colors.primary : "#999"} 
            />
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, []);

  interface DragEndParams {
    from: number;
    to: number;
    data: RankingItem[];
  }

  const handleDragEnd = useCallback(({ data }: DragEndParams) => {
    const updatedItems = data.map((item: RankingItem, index: number) => ({
      ...item,
      id: (index + 1).toString()
    }));
    setItems(updatedItems);
  }, []);

  const handleRerank = async () => {
    if (!user) return;

    try {
      const originalCreator = originalRanking.isRerank 
        ? originalRanking.originalUsername 
        : originalRanking.username;
      const originalId = originalRanking.isRerank
        ? originalRanking.originalRankingId
        : originalRanking.id;

      const rerankData = {
        title: originalRanking.title,
        items: items.map((item, index) => ({ 
          ...item, 
          id: (index + 1).toString()
        })),
        createdAt: new Date(),
        userId: user.uid,
        userEmail: user.email,
        username: user.displayName || 'Anonymous',
        reactions: { ':D': [], ':0': [], ':(': [], '>:(': [] },
        comments: [],
        isRerank: true,
        originalRankingId: originalId,
        originalUsername: originalCreator,
        visibility,
      };

      const docRef = await addDoc(collection(db, 'rankings'), rerankData);
      
      // Add notification for the original ranking creator
      await createNotification(
        'rerank',
        user.uid,
        user.displayName || 'Anonymous',
        originalRanking.userId, // Send to the original ranking creator
        {
          rankingId: docRef.id,
          rankingTitle: originalRanking.title
        }
      );

      Alert.alert('Success', 'Your rerank has been posted!');
      navigation.goBack();
    } catch (error) {
      console.error('Error posting rerank:', error);
      Alert.alert('Error', 'Failed to post rerank. Please try again.');
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Fixed Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.rerankedByText}>
            Reranking {originalRanking.username}'s post
          </Text>
          <Text style={styles.titleText}>{originalRanking.title}</Text>
        </View>

        {/* Scrollable Middle Section */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.listWrapper}>
            <DraggableFlatList
              data={items}
              onDragEnd={handleDragEnd}
              keyExtractor={(item: RankingItem) => item.id.toString()}
              renderItem={renderItem}
              containerStyle={styles.listContainer}
              dragItemOverflow={true}
              scrollEnabled={false}
              activationDistance={0}
              dragHitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
              animationConfig={{
                damping: 20,
                mass: 0.2,
                stiffness: 100,
              }}
              style={{ overflow: 'visible' }}
            />
          </View>
        </ScrollView>

        {/* Fixed Footer Section */}
        <View style={styles.footerSection}>
          <VisibilitySelector
            selectedVisibility={visibility}
            onSelect={setVisibility}
          />
          <TouchableOpacity style={styles.rerankButton} onPress={handleRerank}>
            <Text style={styles.rerankButtonText}>Post Rerank</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerSection: {
    padding: 15,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 20,
  },
  footerSection: {
    padding: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.inputBorder,
  },
  listContainer: {
    overflow: 'visible',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  listWrapper: {
    minHeight: 100,
  },
  itemWrapper: {
    marginVertical: 5,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    width: '100%',
    transform: [{ scale: 1 }],
    ...theme.shadows.small,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    width: '100%',
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
    minWidth: 30,
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  itemText: {
    fontSize: 14,
    flex: 1,
    color: theme.colors.text,
    marginRight: 10,
    height: 20,
    textAlignVertical: 'center',
    paddingVertical: 2,
    fontFamily: theme.fonts.default,
  },
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 0,
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  rerankedByText: {
    fontSize: 16,
    color: theme.colors.secondary,
    marginBottom: 8,
    fontFamily: theme.fonts.default,
  },
  rerankButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 0,
    ...theme.shadows.small,
  },
  rerankButtonText: {
    color: theme.colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.default,
  },
});

export default RerankScreen; 