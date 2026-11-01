import { supabase } from '@/lib/supabase/client';
import { fetchCommentsFromOthers } from '@/lib/real-estate/comments';
import type { ListingComment } from '@/lib/real-estate/types';

const MESSAGE_COLUMNS = 'id, listing_id, buyer_id, sender_id, body, read_at, created_at';

export interface LikeState {
  likedIds: string[];
  counts: Record<string, number>;
}

export interface ThreadMessage {
  id: string;
  listing_id: string;
  buyer_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface MessageNotification {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  body: string;
  createdAt: string;
  isRead: boolean;
}

export interface LikeNotification {
  id: string;
  listingId: string;
  listingTitle: string;
  createdAt: string;
}

export interface CommentNotification extends ListingComment {
  listingTitle: string;
}

export interface NotificationsData {
  messages: MessageNotification[];
  likes: LikeNotification[];
  comments: CommentNotification[];
}

interface ListingTitle {
  id: string;
  title: string;
}

export async function fetchLikeState(userId: string): Promise<LikeState> {
  const { data, error } = await supabase.from('listing_likes').select('listing_id, user_id');
  if (error) throw error;
  const counts: Record<string, number> = {};
  const likedIds: string[] = [];
  for (const row of (data ?? []) as { listing_id: string; user_id: string }[]) {
    counts[row.listing_id] = (counts[row.listing_id] ?? 0) + 1;
    if (row.user_id === userId) likedIds.push(row.listing_id);
  }
  return { likedIds, counts };
}

export async function setListingLiked(listingId: string, liked: boolean): Promise<void> {
  const { error } = liked
    ? await supabase.from('listing_likes').insert({ listing_id: listingId })
    : await supabase.from('listing_likes').delete().eq('listing_id', listingId);
  if (error) throw error;
}

export async function fetchThread(listingId: string, buyerId: string): Promise<ThreadMessage[]> {
  const { data, error } = await supabase
    .from('listing_messages')
    .select(MESSAGE_COLUMNS)
    .eq('listing_id', listingId)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as ThreadMessage[];
}

export async function sendThreadMessage(input: { listingId: string; buyerId: string; body: string }): Promise<ThreadMessage> {
  const { data, error } = await supabase
    .from('listing_messages')
    .insert({ listing_id: input.listingId, buyer_id: input.buyerId, body: input.body })
    .select(MESSAGE_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Sent message was not returned');
  return data as ThreadMessage;
}

export async function markMessagesRead(userId: string, thread?: { listingId: string; buyerId: string }): Promise<void> {
  let query = supabase
    .from('listing_messages')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
    .neq('sender_id', userId);
  if (thread) query = query.eq('listing_id', thread.listingId).eq('buyer_id', thread.buyerId);
  const { error } = await query;
  if (error) throw error;
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('listing_messages')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
    .neq('sender_id', userId);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchNotifications(userId: string): Promise<NotificationsData> {
  const [messageResult, ownListingResult] = await Promise.all([
    supabase.from('listing_messages').select(MESSAGE_COLUMNS).neq('sender_id', userId).order('created_at', { ascending: false }).limit(50),
    supabase.from('listings').select('id, title').eq('user_id', userId),
  ]);
  if (messageResult.error) throw messageResult.error;
  if (ownListingResult.error) throw ownListingResult.error;

  const messageRows = (messageResult.data ?? []) as ThreadMessage[];
  const ownListings = (ownListingResult.data ?? []) as ListingTitle[];
  const ownIds = ownListings.map((listing) => listing.id);

  const likeResult = ownIds.length
    ? await supabase.from('listing_likes').select('listing_id, created_at').in('listing_id', ownIds).neq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    : { data: [], error: null };
  if (likeResult.error) throw likeResult.error;
  const likeRows = (likeResult.data ?? []) as { listing_id: string; created_at: string }[];
  const commentRows = await fetchCommentsFromOthers(ownIds, userId);

  const titles = new Map(ownListings.map((listing) => [listing.id, listing.title]));
  const missingIds = Array.from(new Set(messageRows.map((row) => row.listing_id))).filter((id) => !titles.has(id));
  if (missingIds.length) {
    const { data, error } = await supabase.from('listings').select('id, title').in('id', missingIds);
    if (error) throw error;
    for (const listing of (data ?? []) as ListingTitle[]) titles.set(listing.id, listing.title);
  }
  const titleOf = (listingId: string) => titles.get(listingId) ?? 'İlan';

  return {
    messages: messageRows.map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      listingTitle: titleOf(row.listing_id),
      buyerId: row.buyer_id,
      body: row.body,
      createdAt: row.created_at,
      isRead: row.read_at !== null,
    })),
    likes: likeRows.map((row) => ({
      id: `${row.listing_id}-${row.created_at}`,
      listingId: row.listing_id,
      listingTitle: titleOf(row.listing_id),
      createdAt: row.created_at,
    })),
    comments: commentRows.map((comment) => ({ ...comment, listingTitle: titleOf(comment.listingId) })),
  };
}
