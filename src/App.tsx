import { useState, useEffect } from 'react';
import { useUser, SignInButton, SignedIn, SignedOut, UserButton } from '@insforge/react';
import { insforge } from './lib/insforge';
import './App.css';

type Category = 'good' | 'bad' | 'better';

interface RetroItem {
  id: string;
  category: Category;
  content: string;
  created_by: string;
  created_at: string;
  votes?: Vote[];
  comments?: Comment[];
  users?: {
    nickname: string;
  };
}

interface Vote {
  id: string;
  retro_item_id: string;
  user_id: string;
  users?: {
    nickname: string;
  };
}

interface Comment {
  id: string;
  retro_item_id: string;
  user_id: string;
  content: string;
  created_at: string;
  users?: {
    nickname: string;
  };
}

const CATEGORY_LABELS: Record<Category, string> = {
  good: 'Good',
  bad: 'Bad',
  better: 'Better',
};

const CATEGORY_COLORS: Record<Category, string> = {
  good: 'bg-green-50/30',
  bad: 'bg-red-50/30',
  better: 'bg-blue-50/30',
};

function App() {
  const { user, isLoaded } = useUser();
  const [items, setItems] = useState<RetroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemContent, setNewItemContent] = useState<Record<Category, string>>({
    good: '',
    bad: '',
    better: '',
  });
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isLoaded) {
      fetchItems();
    }
  }, [isLoaded]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await insforge.database
        .from('retro_items')
        .select(`
          *,
          votes (
            id,
            user_id,
            users!votes_user_id_fkey (nickname)
          ),
          comments (
            id,
            user_id,
            content,
            created_at,
            users!comments_user_id_fkey (nickname)
          ),
          users!retro_items_created_by_fkey (nickname)
        `);

      if (error) throw error;
      
      // Sort items by vote count (descending), then by created_at (descending) as tiebreaker
      const sortedData = (data || []).sort((a, b) => {
        const aVotes = a.votes?.length || 0;
        const bVotes = b.votes?.length || 0;
        if (bVotes !== aVotes) {
          return bVotes - aVotes; // Sort by vote count descending
        }
        // If vote counts are equal, sort by created_at descending
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setItems(sortedData);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to load items.';
      console.error('Error details:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (category: Category) => {
    const content = newItemContent[category].trim();
    if (!content || !user) return;

    try {
      const { data, error } = await insforge.database
        .from('retro_items')
        .insert([{ category, content, created_by: user.id }])
        .select(`
          *,
          users!retro_items_created_by_fkey (nickname)
        `)
        .single();

      if (error) throw error;
      
      // Add empty arrays for votes and comments since they don't exist yet
      const newItem = {
        ...data,
        votes: [],
        comments: [],
      };
      
      setItems([newItem, ...items]);
      setNewItemContent({ ...newItemContent, [category]: '' });
    } catch (error: any) {
      console.error('Error adding item:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to add item. Please try again.';
      alert(errorMessage);
    }
  };

  const toggleVote = async (itemId: string) => {
    if (!user) return;

    try {
      // Check if user already voted
      const existingVote = items
        .find((item) => item.id === itemId)
        ?.votes?.find((vote) => vote.user_id === user.id);

      if (existingVote) {
        // Remove vote
        const { error } = await insforge.database
          .from('votes')
          .delete()
          .eq('id', existingVote.id);

        if (error) throw error;
      } else {
        // Add vote
        const { error } = await insforge.database
          .from('votes')
          .insert([{ retro_item_id: itemId, user_id: user.id }]);

        if (error) throw error;
      }

      // Refresh items
      fetchItems();
    } catch (error: any) {
      console.error('Error toggling vote:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to vote. Please try again.';
      alert(errorMessage);
    }
  };

  const addComment = async (itemId: string) => {
    const content = newComments[itemId]?.trim();
    if (!content || !user) return;

    try {
      const { error } = await insforge.database
        .from('comments')
        .insert([{ retro_item_id: itemId, user_id: user.id, content }]);

      if (error) throw error;
      setNewComments({ ...newComments, [itemId]: '' });
      fetchItems();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to add comment. Please try again.';
      alert(errorMessage);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!user) return;
    
    if (!confirm('Are you sure you want to delete this item? This will also delete all votes and comments.')) {
      return;
    }

    try {
      const { error } = await insforge.database
        .from('retro_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      fetchItems();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to delete item. Please try again.';
      alert(errorMessage);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;

    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const { error } = await insforge.database
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      fetchItems();
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to delete comment. Please try again.';
      alert(errorMessage);
    }
  };

  const getItemsByCategory = (category: Category) => {
    return items.filter((item) => item.category === category);
  };

  const hasUserVoted = (item: RetroItem) => {
    return user ? item.votes?.some((vote) => vote.user_id === user.id) : false;
  };

  const getVoterNames = (item: RetroItem) => {
    return item.votes?.map((vote) => vote.users?.nickname || 'Anonymous').join(', ') || '';
  };

  const isItemOwner = (item: RetroItem) => {
    return user && item.created_by === user.id;
  };

  const isCommentOwner = (comment: Comment) => {
    return user && comment.user_id === user.id;
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent animate-spin"></div>
          <div className="text-sm text-gray-500 font-medium">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-gray-900"></div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 tracking-tight">
                Retro Board
              </h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <SignedOut>
                <SignInButton className="px-4 py-1.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors duration-150 text-sm font-medium">
                  Sign In
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <SignedOut>
          <div className="text-center py-20">
            <div className="max-w-sm mx-auto">
              <div className="w-12 h-12 border-2 border-gray-900 rounded-md mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 mb-6 font-medium">Please sign in to participate in the retro meeting</p>
              <SignInButton className="px-6 py-2.5 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors duration-150 text-sm font-medium inline-block">
                Sign In
              </SignInButton>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          {loading ? (
            <div className="text-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent animate-spin"></div>
                <div className="text-sm text-gray-500 font-medium">Loading retro items...</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4 lg:gap-6">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => (
                <div
                  key={category}
                  className={`${CATEGORY_COLORS[category]} border border-gray-200 rounded-md p-4 sm:p-5 transition-colors duration-150 hover:border-gray-300`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 bg-gray-900"></div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">
                      {CATEGORY_LABELS[category]}
                    </h2>
                  </div>

                  {/* Add new item */}
                  <div className="mb-4 sm:mb-5">
                    <textarea
                      value={newItemContent[category]}
                      onChange={(e) =>
                        setNewItemContent({ ...newItemContent, [category]: e.target.value })
                      }
                      placeholder={`Add something that ${CATEGORY_LABELS[category].toLowerCase()}...`}
                      className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors duration-150 text-sm bg-white overflow-y-auto"
                      rows={8}
                    />
                    <button
                      onClick={() => addItem(category)}
                      disabled={!newItemContent[category].trim()}
                      className="mt-2 w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-150 font-medium text-sm"
                    >
                      Add Item
                    </button>
                  </div>

                  {/* Items list */}
                  <div className="space-y-3 sm:space-y-4">
                    {getItemsByCategory(category).length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs font-medium">
                        No items yet
                      </div>
                    ) : (
                      getItemsByCategory(category).map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-gray-200 rounded-md p-4 transition-colors duration-150 hover:border-gray-300 group"
                        >
                          <div className="flex justify-between items-start gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 mb-2 text-sm leading-relaxed break-words font-medium">
                                {item.content}
                              </p>
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border border-gray-300 rounded-sm flex items-center justify-center text-gray-700 text-xs font-semibold bg-white">
                                  {(item.users?.nickname || 'A')[0].toUpperCase()}
                                </div>
                                <p className="text-xs text-gray-500 font-medium">
                                  {item.users?.nickname || 'Anonymous'}
                                </p>
                              </div>
                            </div>
                            {isItemOwner(item) && (
                              <button
                                onClick={() => deleteItem(item.id)}
                                className="flex-shrink-0 w-6 h-6 flex items-center justify-center border border-gray-300 rounded-md text-gray-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Delete item"
                                aria-label="Delete item"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Votes */}
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <button
                              onClick={() => toggleVote(item.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md text-xs font-medium transition-colors duration-150 ${
                                hasUserVoted(item)
                                  ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900 hover:bg-gray-50'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                              </svg>
                              <span>{item.votes?.length || 0}</span>
                            </button>
                            {item.votes && item.votes.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-gray-400">by</span>
                                <span className="text-xs text-gray-600 font-medium max-w-xs truncate">
                                  {getVoterNames(item)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Comments */}
                          <div>
                            <button
                              onClick={() =>
                                setShowComments({
                                  ...showComments,
                                  [item.id]: !showComments[item.id],
                                })
                              }
                              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors duration-150 mb-2"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                              </svg>
                              {showComments[item.id] ? 'Hide' : 'Show'} Comments ({item.comments?.length || 0})
                            </button>

                            {showComments[item.id] && (
                              <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                                {item.comments && item.comments.length > 0 ? (
                                  item.comments.map((comment) => (
                                    <div
                                      key={comment.id}
                                      className="bg-gray-50 border border-gray-200 rounded-md p-3 group/comment"
                                    >
                                      <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-gray-900 text-sm leading-relaxed break-words mb-2 font-medium">
                                            {comment.content}
                                          </p>
                                          <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border border-gray-300 rounded-sm flex items-center justify-center text-gray-700 text-xs font-semibold bg-white">
                                              {(comment.users?.nickname || 'A')[0].toUpperCase()}
                                            </div>
                                            <p className="text-xs text-gray-500 font-medium">
                                              {comment.users?.nickname || 'Anonymous'} •{' '}
                                              {new Date(comment.created_at).toLocaleDateString()}
                                            </p>
                                          </div>
                                        </div>
                                        {isCommentOwner(comment) && (
                                          <button
                                            onClick={() => deleteComment(comment.id)}
                                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center border border-gray-300 rounded-md text-gray-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150 opacity-0 group-hover/comment:opacity-100 focus:opacity-100"
                                            title="Delete comment"
                                            aria-label="Delete comment"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-gray-400 text-center py-2 font-medium">No comments yet</p>
                                )}

                                {/* Add comment */}
                                <div className="pt-2 border-t border-gray-200">
                                  <textarea
                                    value={newComments[item.id] || ''}
                                    onChange={(e) =>
                                      setNewComments({ ...newComments, [item.id]: e.target.value })
                                    }
                                    placeholder="Add a comment..."
                                    className="w-full p-2.5 border border-gray-300 rounded-md resize-none focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors duration-150 text-sm bg-white overflow-y-auto"
                                    rows={8}
                                  />
                                  <button
                                    onClick={() => addComment(item.id)}
                                    disabled={!newComments[item.id]?.trim()}
                                    className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-md text-xs hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-150 font-medium"
                                  >
                                    Add Comment
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SignedIn>
      </main>
    </div>
  );
}

export default App;
