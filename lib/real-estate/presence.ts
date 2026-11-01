import { supabase } from '@/lib/supabase/client';

export async function heartbeat(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_presence')
    .upsert({ user_id: userId, last_seen: new Date().toISOString() });
  if (error) throw error;
}

export async function fetchOnlineUserIds(): Promise<Set<string>> {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('user_presence')
    .select('user_id')
    .gt('last_seen', twoMinutesAgo);
  if (error) return new Set();
  return new Set((data ?? []).map((row: { user_id: string }) => row.user_id));
}

export interface SiteStats {
  totalUsers: number;
  onlineUsers: number;
}

export async function fetchSiteStats(): Promise<SiteStats> {
  const { data, error } = await supabase.rpc('get_site_stats');
  if (error || !data) return { totalUsers: 0, onlineUsers: 0 };
  const row = data as { total_users: number; online_users: number };
  return { totalUsers: Number(row.total_users), onlineUsers: Number(row.online_users) };
}

export async function incrementListingViews(listingId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_listing_views', { p_listing_id: listingId });
  if (error) throw error;
}

export async function fetchFavoriteCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_favorite_counts');
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data as { listing_key: string; count: number }[]) {
    counts[row.listing_key] = Number(row.count);
  }
  return counts;
}

export interface ListingFavoriter {
  userId: string;
  displayName: string;
  favoritedAt: string;
}

export async function fetchListingFavoriters(listingId: string): Promise<ListingFavoriter[]> {
  const { data, error } = await supabase.rpc('get_listing_favoriters', { p_listing_id: listingId });
  if (error || !data) return [];
  return (data as { user_id: string; display_name: string | null; favorited_at: string }[]).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name ?? 'EMLAKTAKAZAN kullanıcısı',
    favoritedAt: row.favorited_at,
  }));
}
