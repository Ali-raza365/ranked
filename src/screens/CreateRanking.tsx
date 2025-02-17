import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import DraggableFlatList, { 
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useNavigation } from '@react-navigation/native';
import { RankingItem } from '../types';
import { theme } from '../styles/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import uuid from 'react-native-uuid';
import { RankingVisibility } from '../types/ranking';
import VisibilitySelector from '../components/VisibilitySelector';
import { notifyFollowersOfNewRanking } from '../firebase/userFunctions';

const CreateRanking = () => {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<RankingItem[]>([]);
  const [newItemContent, setNewItemContent] = useState('');
  const [titleError, setTitleError] = useState('');
  const [itemsError, setItemsError] = useState('');
  const { user } = useCurrentUser();
  const navigation = useNavigation();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [visibility, setVisibility] = useState<RankingVisibility>('global');
  const [isPosting, setIsPosting] = useState(false);

  const addItem = useCallback(() => {
    if (newItemContent.trim() !== '') {
      if (items.some(item => item.content.toLowerCase() === newItemContent.trim().toLowerCase())) {
        setItemsError('This item already exists in your ranking');
        return;
      }

      const newItem: RankingItem = {
        id: uuid.v4().toString(),
        content: newItemContent.trim(),
      };
      setItems((prevItems) => [...prevItems, newItem]);
      setNewItemContent('');
      setItemsError('');
    }
  }, [newItemContent, items]);

  const handleItemPress = (item: RankingItem) => {
    setEditingItemId(item.id);
    setEditingContent(item.content);
  };

  const handleEditSubmit = () => {
    if (editingItemId === null) return;
    
    setItems(prevItems => prevItems.map(item => 
      item.id === editingItemId 
        ? { ...item, content: editingContent.trim() }
        : item
    ));
    
    setEditingItemId(null);
    setEditingContent('');
  };

  const renderItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<RankingItem>) => {
    const index = getIndex();
    
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          onPress={() => handleItemPress(item)}
          style={[styles.itemWrapper, isActive && styles.dragging]}
          disabled={isActive}
          delayLongPress={75}
        >
          <View style={styles.itemContent}>
            <Text style={styles.itemNumber}>{(index ?? 0) + 1}.</Text>
            {editingItemId === item.id ? (
              <TextInput
                value={editingContent}
                onChangeText={setEditingContent}
                style={[styles.itemText, styles.editingInput]}
                autoFocus
                onBlur={handleEditSubmit}
                onSubmitEditing={handleEditSubmit}
              />
            ) : (
              <Text style={styles.itemText} numberOfLines={1}>{item.content}</Text>
            )}
            <MaterialIcons 
              name="drag-handle" 
              size={24} 
              color={isActive ? theme.colors.primary : "#999"} 
            />
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [editingItemId, editingContent, handleItemPress, handleEditSubmit]);

  interface DragEndParams {
    from: number;
    to: number;
    data: RankingItem[];
  }

  const handleDragEnd = useCallback(({ data }: DragEndParams) => {
    setItems(data);
  }, []);

  const keyExtractor = useCallback((item: RankingItem) => item.id, []);

  const validateForm = () => {
    let isValid = true;
    
    if (!title.trim()) {
      setTitleError('Please add a title');
      isValid = false;
    } else {
      setTitleError('');
    }

    if (items.length === 0) {
      setItemsError('Add at least one item to your ranking');
      isValid = false;
    } else {
      setItemsError('');
    }

    return isValid;
  };

  const handlePost = async () => {
    if (!validateForm()) return;

    try {
      setIsPosting(true);

      // Ensure items have numeric IDs
      const formattedItems = items.map((item, index) => ({
        ...item,
        id: index + 1
      }));

      const rankingData = {
        title,
        items: formattedItems,
        userId: user?.uid,
        username: user?.displayName,
        createdAt: new Date(),
        reactions: {
          ':D': [],
          ':0': [],
          ':(': [],
          '>:(': [],
        },
        comments: [],
        visibility
      };

      const docRef = await addDoc(collection(db, 'rankings'), rankingData);

      // Notify followers
      if (user?.uid && user?.displayName) {
        await notifyFollowersOfNewRanking(
          user.uid,
          user.displayName,
          docRef.id,
          title
        );
      }

      navigation.goBack();
    } catch (error) {
      console.error('[Ranking Creation] Error:', error);
      Alert.alert('Error', 'Failed to create ranking. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Fixed Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.titleInput, titleError && styles.inputError]}
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                setTitleError('');
              }}
              placeholder="Ranking Title"
              placeholderTextColor="#A0A0A0"
            />
            {titleError ? (
              <Text style={styles.errorText}>{titleError}</Text>
            ) : null}
          </View>

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

        {/* Scrollable Middle Section */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.listWrapper}>
            <DraggableFlatList
              data={items}
              onDragEnd={handleDragEnd}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              containerStyle={styles.listContainer}
              dragItemOverflow={true}
              activationDistance={0}
              dragHitSlop={{ top: 0, bottom: 0, left: 0, right: 0 }}
              animationConfig={{
                damping: 15,
                mass: 0.3,
                stiffness: 120,
              }}
              style={{ overflow: 'visible' }}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>

        {/* Fixed Footer Section */}
        <View style={styles.footerSection}>
          <VisibilitySelector
            selectedVisibility={visibility}
            onSelect={setVisibility}
          />
          <TouchableOpacity 
            style={styles.postButton} 
            onPress={handlePost}
            disabled={isPosting}
          >
            <Text style={styles.postButtonText}>{isPosting ? 'Posting...' : 'Post Ranking'}</Text>
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
  contentContainer: {
    flex: 1,
  },
  listWrapper: {
    minHeight: 100,
  },
  listContainer: {
    overflow: 'visible',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 0,
    borderBottomWidth: 2,
    borderColor: theme.colors.text,
    paddingBottom: 10,
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  addItemContainer: {
    flexDirection: 'row',
    marginBottom: 0,
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
  dragHandle: {
    padding: 5,
    justifyContent: 'center',
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
  postButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 0,
    ...theme.shadows.small,
  },
  postButtonText: {
    color: theme.colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
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
    zIndex: 999,
  },
  itemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme.colors.surface,
  },
  editingInput: {
    padding: 0,
    margin: 0,
    height: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary,
    textAlignVertical: 'center',
    fontFamily: theme.fonts.default,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputError: {
  },
  errorText: {
    color: theme.colors.error || '#ff0000',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 2,
    fontFamily: theme.fonts.default,
  },
});

export default CreateRanking;
