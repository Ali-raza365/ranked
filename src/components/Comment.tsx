import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import { Comment as CommentType } from '../types/ranking';
import { theme } from '../styles/theme';
import { Menu, MenuTrigger, MenuOptions } from 'react-native-popup-menu';
import { ReportButton } from './ReportButton';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

interface CommentProps {
  comment: CommentType;
  currentUserId: string;
  postOwnerId: string;
  onDelete: (commentId: string) => void;
  onReply: (parentCommentId: string) => void;
  isReply?: boolean;
}

type RootStackParamList = {
  Profile: undefined;
  OtherUserProfile: { userId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

const Comment: React.FC<CommentProps> = ({ 
  comment, 
  currentUserId, 
  postOwnerId, 
  onDelete,
  onReply,
  isReply = false
}) => {
  const navigation = useNavigation<NavigationProp>();
  const canDelete = comment.userId === currentUserId || postOwnerId === currentUserId;

  const renderRightActions = () => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Delete', 
                onPress: () => onDelete(comment.id),
                style: 'destructive'
              }
            ]
          );
        }}
      >
        <MaterialIcons name="delete" size={24} color="white" />
      </TouchableOpacity>
    );
  };

  const handleBlockUser = async () => {
    if (!currentUserId || !comment.userId) return;

    try {
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(comment.userId)
      });
      Alert.alert('Success', 'User has been blocked');
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    }
  };

  const showBlockConfirmation = () => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? You won\'t see their content anymore.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', onPress: handleBlockUser, style: 'destructive' }
      ]
    );
  };

  const handleUsernamePress = () => {
    if (comment.userId === currentUserId) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('OtherUserProfile', { userId: comment.userId });
    }
  };

  return (
    <>
      <Swipeable renderRightActions={canDelete ? renderRightActions : undefined} overshootRight={false}>
        <View style={[styles.container, isReply && styles.replyContainer]}>
          <View style={styles.commentHeader}>
            <TouchableOpacity onPress={handleUsernamePress}>
              <Text style={styles.username}>{comment.username}</Text>
            </TouchableOpacity>
            {currentUserId && currentUserId !== comment.userId && (
              <Menu>
                <MenuTrigger>
                  <MaterialIcons name="more-vert" size={20} color="#666" />
                </MenuTrigger>
                <MenuOptions>
                  <ReportButton
                    contentId={comment.id}
                    contentType="comment"
                    reportedUserId={comment.userId}
                  />
                  <TouchableOpacity style={styles.menuOption} onPress={showBlockConfirmation}>
                    <MaterialIcons name="block" size={20} color="#666" />
                    <Text style={styles.menuOptionText}>Block User</Text>
                  </TouchableOpacity>
                </MenuOptions>
              </Menu>
            )}
          </View>
          <Text style={styles.content}>{comment.content}</Text>
          <TouchableOpacity 
            style={styles.replyButton} 
            onPress={() => onReply(comment.id)}
          >
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        </View>
      </Swipeable>
      
      {comment.replies?.map(reply => (
        <Comment
          key={reply.id}
          comment={reply}
          currentUserId={currentUserId}
          postOwnerId={postOwnerId}
          onDelete={onDelete}
          onReply={onReply}
          isReply={true}
        />
      ))}
    </>
  );
};

const { width } = Dimensions.get('window');
const deleteButtonWidth = width * 0.15;

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  username: {
    fontWeight: 'bold',
    fontFamily: theme.fonts.default,
    color: theme.colors.text,
  },
  content: {
    fontSize: 14,
    fontFamily: theme.fonts.default,
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: deleteButtonWidth,
    height: '100%',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  menuOptionText: {
    marginLeft: 10,
    fontSize: 16,
    fontFamily: theme.fonts.default,
  },
  replyContainer: {
    marginLeft: 20,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.divider,
  },
  replyButton: {
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  replyButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: theme.fonts.default,
  },
});

export default Comment;
