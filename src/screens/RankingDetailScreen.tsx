import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Ranking, Reaction, SerializableRanking, Comment as CommentType } from '../types/ranking';
import RankingItem from '../components/RankingItem';
import CommentComponent from '../components/Comment';
import { reactToRanking, addCommentToRanking, deleteCommentFromRanking } from '../firebase/userFunctions';
import { Timestamp } from 'firebase/firestore';
import { theme } from '../styles/theme';
import { formatTimestamp } from '../utils/dateFormatters';

type RootStackParamList = {
  RankingDetail: { rankingId: string };
  EditRanking: { ranking: SerializableRanking };
};

type RankingDetailScreenRouteProp = RouteProp<RootStackParamList, 'RankingDetail'>;
type RankingDetailScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Props = {
  route: RankingDetailScreenRouteProp;
  navigation: RankingDetailScreenNavigationProp;
};

const RankingDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { rankingId } = route.params;
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [newComment, setNewComment] = useState('');
  const { user } = useCurrentUser();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const rankingDoc = await getDoc(doc(db, 'rankings', rankingId));
        if (rankingDoc.exists()) {
          setRanking({ id: rankingDoc.id, ...rankingDoc.data() } as Ranking);
        } else {
          Alert.alert('Error', 'Ranking not found');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching ranking:', error);
        Alert.alert('Error', 'Failed to load ranking. Please try again.');
      }
    };
    fetchRanking();
  }, [rankingId, navigation]);

  const handleReply = (parentCommentId: string) => {
    setReplyingTo(parentCommentId);
  };

  const handleAddComment = async () => {
    if (!user || !ranking || newComment.trim() === '') return;

    try {
      const comment = await addCommentToRanking(
        user.uid, 
        rankingId, 
        newComment,
        replyingTo
      );

      setRanking(prevRanking => {
        if (!prevRanking) return null;

        const updatedComments = [...prevRanking.comments];
        
        // Add the new comment to the array regardless of whether it's a reply
        updatedComments.push(comment);

        return {
          ...prevRanking,
          comments: updatedComments,
        };
      });

      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    }
  };

  const handleReact = async (rankingId: string, reaction: Reaction) => {
    if (!user) return;
    try {
      await reactToRanking(user.uid, rankingId, reaction);
      // Update local state immediately
      setRanking(prevRanking => {
        if (!prevRanking) return null;
        
        const updatedReactions = { ...prevRanking.reactions };
        const userReactions = Object.entries(updatedReactions);
        
        // Remove user from all reaction arrays
        userReactions.forEach(([key, users]) => {
          updatedReactions[key as Reaction] = users.filter(uid => uid !== user.uid);
        });
        
        // Add user to the selected reaction
        updatedReactions[reaction] = [...updatedReactions[reaction], user.uid];
        
        return {
          ...prevRanking,
          reactions: updatedReactions
        };
      });
    } catch (error) {
      console.error('Error reacting to ranking:', error);
      Alert.alert('Error', 'Failed to react to ranking. Please try again.');
    }
  };

  const handleDelete = async (rankingId: string) => {
    try {
      await deleteDoc(doc(db, 'rankings', rankingId));
      Alert.alert('Success', 'Ranking deleted successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting ranking:', error);
      Alert.alert('Error', 'Failed to delete ranking. Please try again.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !ranking) return;

    try {
      await deleteCommentFromRanking(ranking.id, commentId);
      setRanking(prevRanking => ({
        ...prevRanking!,
        comments: prevRanking!.comments.filter(comment => comment.id !== commentId),
      }));
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment. Please try again.');
    }
  };

  const handleEdit = () => {
    if (!ranking) return;
    
    navigation.navigate('EditRanking', { 
      ranking: {
        ...ranking,
        createdAt: ranking.createdAt instanceof Date 
          ? ranking.createdAt.toISOString() 
          : ranking.createdAt.toDate().toISOString(),
        isRerank: ranking.isRerank || false,
        originalRankingId: ranking.originalRankingId,
        originalUsername: ranking.originalUsername
      }
    });
  };

  // Add this function to organize comments into a tree structure
  const organizeComments = (comments: CommentType[]): CommentType[] => {
    const commentMap = new Map<string, CommentType>();
    const topLevelComments: CommentType[] = [];

    // First pass: create a map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into parent-child relationships
    comments.forEach(comment => {
      const processedComment = commentMap.get(comment.id)!;
      if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
        // This is a reply - add it to its parent's replies
        const parentComment = commentMap.get(comment.parentCommentId)!;
        parentComment.replies = parentComment.replies || [];
        parentComment.replies.push(processedComment);
      } else {
        // This is a top-level comment
        topLevelComments.push(processedComment);
      }
    });

    return topLevelComments;
  };

  // Modify the memoized comments to use the organized structure
  const memoizedComments = useMemo(() => {
    if (!ranking?.comments || !user?.blockedUsers) return [];
    const filteredComments = ranking.comments.filter(
      comment => !user.blockedUsers.includes(comment.userId)
    );
    return organizeComments(filteredComments);
  }, [ranking?.comments, user?.blockedUsers]);

  const renderComment = useCallback(({ item }: { item: CommentType }) => (
    <CommentComponent
      comment={item}
      currentUserId={user?.uid || ''}
      postOwnerId={ranking?.userId || ''}
      onDelete={handleDeleteComment}
      onReply={handleReply}
    />
  ), [user?.uid, ranking?.userId, handleDeleteComment]);

  // Memoize the keyExtractor
  const keyExtractor = useCallback((item: CommentType) => item.id, []);

  // Memoize the empty component
  const ListEmptyComponent = useCallback(() => (
    <Text style={styles.emptyText}>No comments yet</Text>
  ), []);

  // Memoize the header component
  const ListHeaderComponent = useCallback(() => (
    ranking ? (
      <RankingItem
        item={{
          ...ranking,
          createdAt: ranking.createdAt instanceof Date 
            ? ranking.createdAt 
            : ranking.createdAt.toDate()
        }}
        currentUserId={user?.uid}
        onDelete={handleDelete}
        onReact={handleReact}
      />
    ) : null
  ), [ranking, user?.uid, handleDelete, handleReact]);

  if (!ranking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontFamily: theme.fonts.default }}>Loading...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <FlatList
        data={memoizedComments}
        renderItem={renderComment}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={3}
        updateCellsBatchingPeriod={50}
        windowSize={3}
        getItemLayout={(data, index) => ({
          length: 80,
          offset: 80 * index,
          index,
        })}
      />
      {replyingTo && (
        <View style={styles.replyingContainer}>
          <Text style={styles.replyingText}>
            Replying to comment
          </Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Text style={styles.cancelReplyText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newComment}
          onChangeText={setNewComment}
          placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
        />
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.colors.primary }]} 
          onPress={handleAddComment}
        >
          <Text style={styles.buttonText}>
            {replyingTo ? 'Reply' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontFamily: theme.fonts.default,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    fontFamily: theme.fonts.default,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.colors.buttonText,
    fontWeight: 'bold',
    fontFamily: theme.fonts.default,
  },
  replyingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  replyingText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: theme.fonts.default,
  },
  cancelReplyText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontFamily: theme.fonts.default,
  },
});

export default RankingDetailScreen;
