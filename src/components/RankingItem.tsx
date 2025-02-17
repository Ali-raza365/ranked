import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Modal, FlatList } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Ranking, Reaction, SerializableRanking, RankingItem as RankingItemType } from '../types/ranking';
import ReactionDropdown from './ReactionDropdown';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { theme } from '../styles/theme';
import { Menu, MenuTrigger, MenuOptions, MenuOption } from 'react-native-popup-menu';
import { Timestamp } from 'firebase/firestore';
import { formatTimestamp } from '../utils/dateFormatters';
import { ReportButton } from './ReportButton';
import { Entypo } from '@expo/vector-icons';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

type RootStackParamList = {
  EditRanking: { ranking: SerializableRanking };
  RankingDetail: { rankingId: string };
  Rerank: { originalRanking: SerializableRanking };
  Profile: undefined;
  OtherUserProfile: { userId: string };
  Report: { contentId: string; contentType: string; reportedUserId: string };
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface RankingItemProps {
  item: Ranking;
  currentUserId: string | undefined;
  onDelete: (rankingId: string) => Promise<void>;
  onReact: (rankingId: string, reaction: Reaction) => Promise<void>;
}

interface ReactionUser {
  userId: string;
  username: string;
}

const RankingItem: React.FC<RankingItemProps> = ({ item, currentUserId, onDelete, onReact }) => {
  const startTime = Date.now();

  const [showReactions, setShowReactions] = useState(false);
  const [showReactionUsers, setShowReactionUsers] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);
  const [reactionUsers, setReactionUsers] = useState<{ userId: string; username: string; reaction: Reaction }[]>([]);
  const navigation = useNavigation<NavigationProp>();

  const handleReact = (reaction: Reaction) => {
    onReact(item.id, reaction);
    setShowReactions(false);
  };

  const handleReactionLongPress = async () => {
    setShowReactionUsers(true);
    const reactions = await getAllReactions();
    setReactionUsers(reactions);
  };

  const renderReactionCounts = () => {
    const reactionOrder: Reaction[] = [':D', ':0', ':(', '>:('];
    
    const reactions = item.reactions || {};
    
    return (
      <View style={styles.reactionCountsContainer}>
        <View style={styles.reactionsRow}>
          {reactionOrder.map((reaction) => {
            const count = reactions[reaction]?.length || 0;
            if (count > 0) {
              return (
                <TouchableOpacity
                  key={reaction}
                  style={styles.reactionCountBubble}
                  onPress={() => handleReact(reaction)}
                  onLongPress={handleReactionLongPress}
                  delayLongPress={500}
                >
                  <Text style={styles.reactionCountText}>
                    {reaction} {count}
                  </Text>
                </TouchableOpacity>
              );
            }
            return null;
          })}
        </View>
        <Text style={styles.commentCount}>
          {item.comments?.length || 0} comments
        </Text>
      </View>
    );
  };

  const handlePress = () => {
    navigation.navigate('RankingDetail', { rankingId: item.id });
  };

  const handleEdit = () => {
    navigation.navigate('EditRanking', { 
      ranking: {
        id: item.id,
        title: item.title,
        items: item.items,
        userId: item.userId,
        createdAt: item.createdAt instanceof Date 
          ? item.createdAt.toISOString() 
          : item.createdAt.toDate().toISOString(),
        userEmail: item.userEmail,
        username: item.username,
        reactions: item.reactions,
        comments: item.comments,
        isRerank: item.isRerank || false,
        originalRankingId: item.originalRankingId,
        originalUsername: item.originalUsername,
        visibility: item.visibility
      }
    });
  };

  const renderItem = useCallback((rankItem: RankingItemType, index: number, totalItems: number) => {
    return (
      <View key={rankItem.id.toString()}>
        <View style={styles.rankingItemRow}>
          <View style={styles.rankNumber}>
            <Text style={styles.rankNumberText}>#{rankItem.id}</Text>
          </View>
          <Text style={styles.rankingItemText}>
            {rankItem.content}
          </Text>
        </View>
        {index < totalItems - 1 && <View style={styles.itemDivider} />}
      </View>
    );
  }, []);

  useEffect(() => {
  });

  const handleUsernamePress = () => {
    if (item.userId === currentUserId) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('OtherUserProfile', { userId: item.userId });
    }
  };

  const handleReport = (contentId: string, contentType: string, reportedUserId: string) => {
    navigation.navigate('Report', {
      contentId,
      contentType,
      reportedUserId,
    });
  };

  const handleRerankPress = () => {
    if (item.isRerank && item.originalRankingId) {
      navigation.navigate('RankingDetail', { rankingId: item.originalRankingId });
    }
  };

  // Create a function to get all reactions and fetch usernames
  const getAllReactions = async () => {
    const reactionOrder: Reaction[] = [':D', ':0', ':(', '>:('];
    const allReactions: { userId: string; username: string; reaction: Reaction }[] = [];
    
    for (const reaction of reactionOrder) {
      const users = item.reactions[reaction] || [];
      for (const userId of users) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userData = userDoc.data();
          allReactions.push({
            userId,
            username: userData?.displayName || 'Unknown User',
            reaction
          });
        } catch (error) {
          console.error('Error fetching user:', error);
          allReactions.push({
            userId,
            username: 'Unknown User',
            reaction
          });
        }
      }
    }

    return allReactions;
  };

  // Ensure item exists before rendering
  if (!item) {
    return null;
  }

  const getVisibilityIcon = () => {
    if (item.visibility === 'global') {
      return <MaterialIcons name="public" size={16} color={theme.colors.textSecondary} />;
    } else if (item.visibility === 'private') {
      return <MaterialIcons name="lock" size={16} color={theme.colors.textSecondary} />;
    } else if (item.visibility === 'friends') {
      return <MaterialIcons name="group" size={16} color={theme.colors.textSecondary} />;
    }
    return null;
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <View 
        style={styles.rankingItem}
        onLayout={(event) => {
        }}
      >
        <View style={styles.rankingHeader}>
          <View style={styles.titleContainer}>
            {item.isRerank && (
              <TouchableOpacity onPress={handleRerankPress}>
                <Text style={[styles.rerankText, styles.clickableText]}>
                  {item.username} reranked {item.originalUsername}'s ranking
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.rankingTitle} numberOfLines={2} ellipsizeMode="tail">
              {item.title}
            </Text>
            <View style={styles.authorContainer}>
              <MaterialCommunityIcons name="account-circle" size={14} color={theme.colors.textSecondary} />
              <TouchableOpacity onPress={handleUsernamePress}>
                <Text style={[styles.rankingAuthor, styles.clickableText]}>
                  {"@" + item.username || item.userEmail}
                </Text>
              </TouchableOpacity>
              <Text style={styles.timestamp}>• {formatTimestamp(item.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {getVisibilityIcon()}
            <Menu>
              <MenuTrigger>
                <Entypo 
                  name="dots-three-horizontal" 
                  size={16} 
                  color={theme.colors.textSecondary}
                  style={styles.menuIcon} 
                />
              </MenuTrigger>
              <MenuOptions>
                {currentUserId === item.userId ? (
                  // Show edit and delete options for user's own post
                  <>
                    <MenuOption onSelect={handleEdit}>
                      <View style={styles.menuOption}>
                        <MaterialIcons name="edit" size={20} color="#666" />
                        <Text style={styles.menuOptionText}>Edit</Text>
                      </View>
                    </MenuOption>
                    <MenuOption onSelect={() => {
                      Alert.alert(
                        'Delete Ranking',
                        'Are you sure you want to delete this ranking?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', onPress: () => onDelete?.(item.id), style: 'destructive' }
                        ]
                      );
                    }}>
                      <View style={styles.menuOption}>
                        <MaterialIcons name="delete" size={20} color="#ff0000" />
                        <Text style={[styles.menuOptionText, styles.deleteText]}>Delete</Text>
                      </View>
                    </MenuOption>
                  </>
                ) : (
                  <ReportButton 
                    contentId={item.id}
                    contentType="ranking"
                    reportedUserId={item.userId}
                  />
                )}
              </MenuOptions>
            </Menu>
          </View>
        </View>
        <View style={styles.rankingsContainer}>
          {item.items && item.items.map((rankItem, index) => 
            renderItem(rankItem, index, item.items.length)
          )}
        </View>
        <View style={styles.footer}>
          {renderReactionCounts()}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setShowReactions(!showReactions)}
            >
              <MaterialCommunityIcons 
                name="emoticon-happy-outline" 
                size={18} 
                color={theme.colors.text} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={handlePress}
            >
              <MaterialCommunityIcons 
                name="comment-outline" 
                size={20} 
                color={theme.colors.text} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.rerankButton]}
              onPress={() => {
                const serializableRanking: SerializableRanking = {
                  ...item,
                  createdAt: item.createdAt instanceof Date 
                    ? item.createdAt.toISOString()
                    : item.createdAt.toDate().toISOString()
                };
                navigation.navigate('Rerank', { originalRanking: serializableRanking });
              }}
            >
              <Text style={styles.rerankButtonText}>Rerank</Text>
            </TouchableOpacity>
          </View>
        </View>
        {showReactions && (
          <ReactionDropdown onReact={handleReact} />
        )}
      </View>
      <Modal
        visible={showReactionUsers}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReactionUsers(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowReactionUsers(false)}
        >
          <View 
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => {
              e.stopPropagation();
            }}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reactions</Text>
              <TouchableOpacity onPress={() => setShowReactionUsers(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={reactionUsers}
              keyExtractor={(item, index) => `${item.userId}-${index}`}
              renderItem={({ item: reactionData }) => (
                <TouchableOpacity 
                  style={styles.reactionUserItem}
                  onPress={() => {
                    setShowReactionUsers(false);
                    if (reactionData.userId === currentUserId) {
                      navigation.navigate('Profile');
                    } else {
                      navigation.navigate('OtherUserProfile', { userId: reactionData.userId });
                    }
                  }}
                >
                  <Text style={styles.username}>@{reactionData.username}</Text>
                  <Text style={styles.reactionType}>{reactionData.reaction}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>No reactions yet</Text>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 250,
    backgroundColor: theme.colors.surface,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    ...theme.shadows.small,
  },
  rankingItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  rankingTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
    color: theme.colors.text,
    letterSpacing: -0.3,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  authorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankingAuthor: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rankingsContainer: {
    backgroundColor: theme.colors.surface === '#FFFFFF' ? '#FAFAFA' : '#1A1A1A',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.surface === '#FFFFFF' ? '#E5E5E5' : '#333333',
  },
  rankingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  rankNumber: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: theme.colors.surface === '#FFFFFF' ? '#F0F0F0' : '#2A2A2A',
    borderRadius: 6,
  },
  rankNumberText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rankingItemText: {
    fontSize: 13,
    color: theme.colors.text,
    flex: 1,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface === '#FFFFFF' ? '#F0F0F0' : '#333333',
  },
  reactionCountsContainer: {
    flex: 1,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  reactionCountBubble: {
    backgroundColor: theme.colors.surface === '#FFFFFF' ? '#F0F0F0' : '#2A2A2A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  reactionCountText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    backgroundColor: 'transparent',
    padding: 6,
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rerankButton: {
    width: 'auto',
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface === '#FFFFFF' ? '#F0F0F0' : '#2A2A2A',
    borderRadius: 8,
  },
  rerankButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  itemDivider: {
    height: 1,
    backgroundColor: theme.colors.surface === '#FFFFFF' ? '#F0F0F0' : '#333333',
    marginHorizontal: 8,
  },
  commentCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  rankingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  rerankText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
    fontFamily: theme.fonts.default,
  },
  timestamp: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    fontFamily: theme.fonts.default,
  },
  clickableText: {
    textDecorationLine: 'none',
  },
  menuTrigger: {
    position: 'absolute',
    right: 10,
    top: 10,
    padding: 5
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
  deleteText: {
    color: '#ff0000',
    fontFamily: theme.fonts.default,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  closeButton: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    padding: 8,
  },
  reactionUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  username: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: theme.fonts.default,
  },
  reactionType: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.default,
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.default,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuIcon: {
    padding: 4,
  },
});

export default React.memo(RankingItem, (prevProps, nextProps) => {
  const getDateValue = (date: Date | Timestamp | undefined) => {
    if (!date) return undefined;
    if (date instanceof Date) return date.getTime();
    return date.toDate().getTime();
  };

  const itemEqual = 
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title &&
    prevProps.currentUserId === nextProps.currentUserId &&
    getDateValue(prevProps.item.createdAt) === getDateValue(nextProps.item.createdAt) &&
    JSON.stringify(prevProps.item.items) === JSON.stringify(nextProps.item.items) &&
    JSON.stringify(prevProps.item.reactions) === JSON.stringify(nextProps.item.reactions);

  return itemEqual;
});
