import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ThumbsUp, MessageSquare, MoreVertical, Send, ChevronDown } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../utils/AuthContext';

interface Comment {
  id: string;
  outfit_id: string;
  session_id: string;
  user_id: string | null;
  nickname: string;
  content: string;
  likes: number;
  parent_id: string | null;
  created_at: string;
}

interface CommentSheetProps {
  outfitId: string;
  outfitThumbnail: string;
  outfitLabel?: string;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
}

function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

function getOrCreateNickname(): string {
  let nickname = localStorage.getItem('comment_nickname');
  if (!nickname) {
    const adjectives = ['Cool', 'Happy', 'Chill', 'Fancy', 'Trendy', 'Bold', 'Fresh', 'Sleek', 'Sharp', 'Neat'];
    const nouns = ['Cat', 'Fox', 'Bear', 'Owl', 'Wolf', 'Hawk', 'Deer', 'Lion', 'Puma', 'Lynx'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);
    nickname = `${adj}${noun}${num}`;
    localStorage.setItem('comment_nickname', nickname);
  }
  return nickname;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
    'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-rose-500',
    'bg-pink-500', 'bg-sky-500', 'bg-lime-500', 'bg-green-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function CommentSheet({
  outfitId,
  outfitThumbnail,
  outfitLabel,
  onClose,
  onCommentCountChange,
}: CommentSheetProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'latest' | 'likes'>('latest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [menuCommentId, setMenuCommentId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const sessionId = getOrCreateSessionId();
  const nickname = getOrCreateNickname();

  const onCommentCountChangeRef = useRef(onCommentCountChange);
  onCommentCountChangeRef.current = onCommentCountChange;

  const loadComments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('outfit_comments')
      .select('*')
      .eq('outfit_id', outfitId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments(data);
      const topLevelCount = data.filter(c => !c.parent_id).length;
      onCommentCountChangeRef.current?.(topLevelCount);
    }
    setLoading(false);
  }, [outfitId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async () => {
    const text = newComment.trim();
    if (!text || submitting) return;

    setSubmitting(true);
    const { error } = await supabase.from('outfit_comments').insert({
      outfit_id: outfitId,
      session_id: sessionId,
      user_id: user?.id || null,
      nickname: user?.user_metadata?.full_name || nickname,
      content: text,
      parent_id: replyTo?.id || null,
    });

    if (!error) {
      setNewComment('');
      setReplyTo(null);
      await loadComments();
      if (listRef.current) listRef.current.scrollTop = 0;
    }
    setSubmitting(false);
  };

  const handleDelete = async (commentId: string) => {
    setMenuCommentId(null);
    await supabase.from('outfit_comments').delete().eq('id', commentId).eq('session_id', sessionId);
    await loadComments();
  };

  const handleLike = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    await supabase
      .from('outfit_comments')
      .update({ likes: comment.likes + 1 })
      .eq('id', commentId);
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes: c.likes + 1 } : c));
  };

  const topComments = comments.filter(c => !c.parent_id);
  const sortedTopComments = [...topComments].sort((a, b) => {
    if (sortBy === 'likes') return b.likes - a.likes;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const getReplies = (parentId: string) =>
    comments
      .filter(c => c.parent_id === parentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const totalCount = topComments.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        ref={sheetRef}
        className="relative w-full max-w-lg bg-white rounded-t-2xl flex flex-col animate-slideUp"
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="flex-shrink-0 px-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-16 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={outfitThumbnail}
                alt="Outfit"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 truncate">{outfitLabel || 'Outfit'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">Comments</h3>
              <span className="text-base text-gray-500">{totalCount}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="16" y2="6" />
                    <line x1="4" y1="12" x2="12" y2="12" />
                    <line x1="4" y1="18" x2="8" y2="18" />
                  </svg>
                </button>
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
                    <button
                      onClick={() => { setSortBy('latest'); setShowSortMenu(false); }}
                      className={`block w-full text-left px-4 py-2.5 text-sm ${sortBy === 'latest' ? 'font-semibold' : 'text-gray-600'}`}
                    >
                      Latest
                    </button>
                    <button
                      onClick={() => { setSortBy('likes'); setShowSortMenu(false); }}
                      className={`block w-full text-left px-4 py-2.5 text-sm ${sortBy === 'likes' ? 'font-semibold' : 'text-gray-600'}`}
                    >
                      Most Liked
                    </button>
                  </div>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          ) : sortedTopComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <MessageSquare size={40} strokeWidth={1.5} className="mb-3" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Be the first to comment</p>
            </div>
          ) : (
            sortedTopComments.map(comment => {
              const replies = getReplies(comment.id);
              const isExpanded = expandedReplies.has(comment.id);
              const isOwn = comment.session_id === sessionId;
              const avatarColor = getAvatarColor(comment.nickname);

              return (
                <div key={comment.id} className="mb-5">
                  <div className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${avatarColor}`}>
                      {comment.nickname.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-900">@{comment.nickname}</span>
                        <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => handleLike(comment.id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <ThumbsUp size={14} />
                          {comment.likes > 0 && <span className="text-xs">{comment.likes}</span>}
                        </button>
                        <button
                          onClick={() => handleLike(comment.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors rotate-180"
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button
                          onClick={() => { setReplyTo(comment); inputRef.current?.focus(); }}
                          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </div>
                    {isOwn && (
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={() => setMenuCommentId(menuCommentId === comment.id ? null : comment.id)}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                        {menuCommentId === comment.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[100px]">
                            <button
                              onClick={() => handleDelete(comment.id)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {replies.length > 0 && (
                    <div className="ml-11 mt-2">
                      {!isExpanded && (
                        <button
                          onClick={() => setExpandedReplies(prev => new Set(prev).add(comment.id))}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 mb-2"
                        >
                          <ChevronDown size={14} />
                          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </button>
                      )}
                      {isExpanded && replies.map(reply => {
                        const replyAvatarColor = getAvatarColor(reply.nickname);
                        const isReplyOwn = reply.session_id === sessionId;
                        return (
                          <div key={reply.id} className="flex gap-2.5 mb-3">
                            <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold ${replyAvatarColor}`}>
                              {reply.nickname.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-900">@{reply.nickname}</span>
                                <span className="text-xs text-gray-400">{timeAgo(reply.created_at)}</span>
                              </div>
                              <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap break-words">{reply.content}</p>
                              <div className="flex items-center gap-4 mt-1.5">
                                <button
                                  onClick={() => handleLike(reply.id)}
                                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                  <ThumbsUp size={12} />
                                  {reply.likes > 0 && <span className="text-xs">{reply.likes}</span>}
                                </button>
                                <button
                                  onClick={() => handleLike(reply.id)}
                                  className="text-gray-400 hover:text-gray-600 transition-colors rotate-180"
                                >
                                  <ThumbsUp size={12} />
                                </button>
                              </div>
                            </div>
                            {isReplyOwn && (
                              <div className="relative flex-shrink-0">
                                <button
                                  onClick={() => setMenuCommentId(menuCommentId === reply.id ? null : reply.id)}
                                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                  <MoreVertical size={14} className="text-gray-400" />
                                </button>
                                {menuCommentId === reply.id && (
                                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[100px]">
                                    <button
                                      onClick={() => handleDelete(reply.id)}
                                      className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {isExpanded && (
                        <button
                          onClick={() => setExpandedReplies(prev => { const n = new Set(prev); n.delete(comment.id); return n; })}
                          className="text-xs text-gray-400 hover:text-gray-600 mb-1"
                        >
                          Hide replies
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 px-4 py-3 bg-white">
          {replyTo && (
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-gray-500">
                Replying to <span className="font-medium text-gray-700">@{replyTo.nickname}</span>
              </span>
              <button onClick={() => setReplyTo(null)} className="text-xs text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${getAvatarColor(nickname)}`}>
              {(user?.user_metadata?.full_name || nickname).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder={replyTo ? `Reply to @${replyTo.nickname}...` : 'Add a comment...'}
                className="w-full px-4 py-2.5 pr-12 text-sm border border-gray-200 rounded-full focus:outline-none focus:border-gray-400 transition-colors bg-gray-50"
                disabled={submitting}
              />
              <button
                onClick={handleSubmit}
                disabled={!newComment.trim() || submitting}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${
                  newComment.trim() && !submitting
                    ? 'text-blue-600 hover:bg-blue-50'
                    : 'text-gray-300'
                }`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
