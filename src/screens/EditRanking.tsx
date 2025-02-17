import React, { useState, useCallback } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { SerializableRanking, RankingItem, RankingVisibility } from '../types/ranking';
import { theme } from '../styles/theme';
import DraggableFlatList, { 
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import VisibilitySelector from '../components/VisibilitySelector';

type EditRankingRouteProp = RouteProp<{
  EditRanking: { ranking: SerializableRanking };
}, 'EditRanking'>;

type Props = {
  route: EditRankingRouteProp;
};

const EditRanking: React.FC<Props> = ({ route }) => {
  const { ranking } = route.params;
  const [title, setTitle] = useState(ranking.title);
  const [items, setItems] = useState<RankingItem[]>(ranking.items || []);
  const [visibility, setVisibility] = useState<RankingVisibility>(ranking.visibility);
  const [newItemContent, setNewItemContent] = useState('');
  const [itemsError, setItemsError] = useState('');
  const navigation = useNavigation();

  const addItem = useCallback(() => {
    if (newItemContent.trim() !== '') {
      if (items.some(item => item.content.toLowerCase() === newItemContent.trim().toLowerCase())) {
        setItemsError('This item already exists in your ranking');
        return;
      }

      const newItem: RankingItem = {
        id: (items.length + 1).toString(),
        content: newItemContent.trim(),
      };
      setItems((prevItems) => [...prevItems, newItem]);
      setNewItemContent('');
      setItemsError('');
    }
  }, [newItemContent, items]);

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<RankingItem>) => {
    const index = getIndex();
    
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={150}
          style={[styles.itemWrapper, isActive && styles.dragging]}
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

  const handleSave = async () => {
    try {
      const rankingRef = doc(db, 'rankings', ranking.id);
      const updateData: any = {
        title,
        items,
        visibility,
        isRerank: ranking.isRerank || false,
      };

      if (ranking.originalRankingId) {
        updateData.originalRankingId = ranking.originalRankingId;
      }
      if (ranking.originalUsername) {
        updateData.originalUsername = ranking.originalUsername;
      }

      await updateDoc(rankingRef, updateData);
      Alert.alert('Success', 'Ranking updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating ranking:', error);
      Alert.alert('Error', 'Failed to update ranking. Please try again.');
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Ranking Title"
            placeholderTextColor="#A0A0A0"
          />

          <View style={styles.addItemContainer}>
            <TextInput
              style={[styles.newItemInput, itemsError && styles.inputError]}
              value={newItemContent}
              onChangeText={(text) => {
                setNewItemContent(text);
                setItemsError('');
              }}
              placeholder="Add an item"
              placeholderTextColor="#A0A0A0"
              onSubmitEditing={addItem}
            />
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {itemsError ? (
            <Text style={styles.errorText}>{itemsError}</Text>
          ) : null}
        </View>

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

        <View style={styles.footerSection}>
          <VisibilitySelector
            selectedVisibility={visibility}
            onSelect={setVisibility}
          />
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
    padding: 15,
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
  dragging: {
    opacity: 0.9,
    transform: [{ scale: 1.03 }],
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderColor: theme.colors.text,
    paddingBottom: 10,
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 0,
    ...theme.shadows.small,
  },
  saveButtonText: {
    color: theme.colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.default,
  },
  visibilityContainer: {
    position: 'relative',
    zIndex: 1,
    alignSelf: 'flex-start',
    marginBottom: 8,
    width: 120,
  },
  addItemContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  newItemInput: {
    flex: 1,
    marginRight: 10,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
    ...theme.shadows.small,
  },
  addButtonText: {
    color: theme.colors.buttonText,
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: theme.fonts.default,
  },
  errorText: {
    color: theme.colors.error || '#ff0000',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 2,
    fontFamily: theme.fonts.default,
  },
  inputError: {
    borderColor: theme.colors.error || '#ff0000',
  },
});

export default EditRanking; 