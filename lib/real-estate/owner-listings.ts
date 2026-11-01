import { supabase } from '@/lib/supabase/client';

export type ListingStatus = 'active' | 'passive';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface OwnedListing {
  id: string;
  title: string;
  city: string;
  district: string;
  property_type: string;
  price: number;
  area: number;
  image_urls: string[] | null;
  status: ListingStatus;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  created_at: string;
}

export interface OwnedListingDetail {
  id: string;
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
  details: Record<string, string> | null;
  latitude: number | null;
  longitude: number | null;
  image_urls: string[] | null;
  video_url: string | null;
}

export interface OwnedListingChanges {
  title: string;
  description: string;
  propertyType: string;
  city: string;
  district: string;
  neighborhood: string;
  price: number;
  area: number;
  rooms: string;
  floor: string;
  features: string[];
  details: Record<string, string>;
  latitude: number | null;
  longitude: number | null;
  imageUrls: string[];
  videoUrl: string | null;
}

const OWNED_COLUMNS = 'id, title, city, district, property_type, price, area, image_urls, status, approval_status, rejection_reason, created_at';
const DETAIL_COLUMNS = 'id, title, description, property_type, city, district, neighborhood, price, area, rooms, floor, features, details, latitude, longitude, image_urls, video_url';

export async function fetchOwnedListings(userId: string): Promise<OwnedListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(OWNED_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as OwnedListing[];
}

export async function fetchOwnedListingDetail(listingId: string): Promise<OwnedListingDetail | null> {
  const { data, error } = await supabase.from('listings').select(DETAIL_COLUMNS).eq('id', listingId).maybeSingle();
  if (error) throw error;
  return (data as OwnedListingDetail | null) ?? null;
}

export async function updateOwnedListing(listingId: string, changes: OwnedListingChanges): Promise<void> {
  const { error } = await supabase.from('listings').update({
    title: changes.title,
    description: changes.description,
    property_type: changes.propertyType,
    city: changes.city,
    district: changes.district,
    neighborhood: changes.neighborhood,
    price: changes.price,
    area: changes.area,
    rooms: changes.rooms,
    floor: changes.floor,
    features: changes.features,
    details: changes.details,
    latitude: changes.latitude,
    longitude: changes.longitude,
    image_urls: changes.imageUrls,
    video_url: changes.videoUrl,
  }).eq('id', listingId);
  if (error) throw error;
}

export async function setOwnedListingStatus(listingId: string, status: ListingStatus): Promise<void> {
  const { error } = await supabase.from('listings').update({ status }).eq('id', listingId);
  if (error) throw error;
}

export async function deleteOwnedListing(listingId: string): Promise<void> {
  const { error } = await supabase.from('listings').delete().eq('id', listingId);
  if (error) throw error;
}
