import { supabase } from '@/lib/supabase/client';
import type { ListingComment } from '@/lib/real-estate/types';

const COMMENT_COLUMNS = 'id, listing_id, user_id, body, created_at';

interface CommentRow {
  id: string;
  listing_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

async function withAuthorNames(rows: CommentRow[]): Promise<ListingComment[]> {
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const names = new Map<string, string>();
  if (userIds.length) {
    const { data, error } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
    if (error) throw error;
    for (const profile of (data ?? []) as { id: string; display_name: string | null }[]) {
      names.set(profile.id, profile.display_name?.trim() || 'Kullanıcı');
    }
  }
  return rows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    userId: row.user_id,
    authorName: names.get(row.user_id) ?? 'Kullanıcı',
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function fetchListingComments(listingIds: string[]): Promise<ListingComment[]> {
  if (listingIds.length === 0) return [];
  const { data, error } = await supabase
    .from('listing_comments')
    .select(COMMENT_COLUMNS)
    .in('listing_id', listingIds)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return withAuthorNames((data ?? []) as CommentRow[]);
}

export async function fetchCommentsFromOthers(listingIds: string[], userId: string): Promise<ListingComment[]> {
  if (listingIds.length === 0) return [];
  const { data, error } = await supabase
    .from('listing_comments')
    .select(COMMENT_COLUMNS)
    .in('listing_id', listingIds)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return withAuthorNames((data ?? []) as CommentRow[]);
}

export async function addListingComment(listingId: string, body: string): Promise<void> {
  const { error } = await supabase.from('listing_comments').insert({ listing_id: listingId, body });
  if (error) throw error;
}

export async function deleteListingComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('listing_comments').delete().eq('id', commentId);
  if (error) throw error;
}
