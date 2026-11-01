import { supabase } from '@/lib/supabase/client';
import { listings as sampleListings } from '@/lib/real-estate/listings';
import type { PropertyType } from '@/lib/real-estate/property-types';
import type { Listing, ListingComment } from '@/lib/real-estate/types';
import { fetchListingComments } from '@/lib/real-estate/comments';

const FEED_COLUMNS = 'id, user_id, title, description, property_type, city, district, neighborhood, price, area, rooms, floor, features, latitude, longitude, image_urls, seller_type, agent_office_name, agent_myk_number, video_url, views';

interface ListingRow {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  property_type: string;
  city: string;
  district: string;
  neighborhood: string;
  price: number;
  area: number;
  rooms: string;
  floor: string;
  features: string[] | null;
  latitude: number | null;
  longitude: number | null;
  image_urls: string[] | null;
  seller_type: 'owner' | 'agent';
  agent_office_name: string | null;
  agent_myk_number: string | null;
  video_url: string | null;
  views: number;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
  office_name: string | null;
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('tr-TR');
}

function toListing(row: ListingRow, profile: ProfileRow | undefined, comments: ListingComment[]): Listing {
  const isAgent = row.seller_type === 'agent';
  const name = profile?.display_name?.trim() || (isAgent ? 'Emlakçı' : 'İlan sahibi');
  const office = isAgent ? (row.agent_office_name || profile?.office_name || '') : '';
  const gallery = row.image_urls?.length ? row.image_urls : [sampleListings[0].image];
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    district: row.district,
    neighborhood: row.neighborhood,
    type: row.property_type as PropertyType,
    price: Number(row.price),
    area: Number(row.area),
    rooms: row.rooms,
    floor: row.floor,
    image: gallery[0],
    gallery,
    views: row.views ?? 0,
    likes: 0,
    comments: comments.length,
    recentComments: comments.slice(0, 2),
    isFeatured: false,
    agent: { name, office, initials: initialsOf(name), verified: isAgent },
    features: row.features ?? [],
    description: row.description,
    coordinates: row.latitude !== null && row.longitude !== null ? { lat: row.latitude, lng: row.longitude } : null,
    status: 'active',
    sellerType: row.seller_type,
    ownerId: row.user_id,
    mykNumber: isAgent ? row.agent_myk_number : null,
    videoUrl: row.video_url ?? null,
  };
}

export async function fetchApprovedListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(FEED_COLUMNS)
    .eq('approval_status', 'approved')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  const rows = (data ?? []) as ListingRow[];
  const ownerIds = Array.from(new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id))));
  const profiles = new Map<string, ProfileRow>();
  if (ownerIds.length) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, display_name, office_name')
      .in('id', ownerIds);
    if (profileError) throw profileError;
    for (const profile of (profileRows ?? []) as ProfileRow[]) profiles.set(profile.id, profile);
  }

  const commentsByListing = new Map<string, ListingComment[]>();
  for (const comment of await fetchListingComments(rows.map((row) => row.id))) {
    commentsByListing.set(comment.listingId, [...(commentsByListing.get(comment.listingId) ?? []), comment]);
  }

  return rows.map((row) => toListing(row, row.user_id ? profiles.get(row.user_id) : undefined, commentsByListing.get(row.id) ?? []));
}
