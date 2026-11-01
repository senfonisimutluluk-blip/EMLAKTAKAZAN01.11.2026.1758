import type { PropertyType } from './property-types';

export type ListingStatus = 'active' | 'passive';
export type SellerType = 'owner' | 'agent';

export interface SellerDetails {
  sellerType: SellerType;
  propertyNumber: string;
  agentOfficeName: string;
  agentAuthorityNumber: string;
  agentMykNumber: string;
  authorityDocumentPath: string;
}

export interface ListingComment {
  id: string;
  listingId: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface Listing {
  id: string;
  title: string;
  city: string;
  district: string;
  neighborhood: string;
  type: PropertyType;
  price: number;
  area: number;
  rooms: string;
  floor: string;
  image: string;
  gallery: string[];
  views: number;
  likes: number;
  comments: number;
  recentComments?: ListingComment[];
  isFeatured: boolean;
  agent: { name: string; office: string; initials: string; verified: boolean };
  features: string[];
  description: string;
  coordinates: { lat: number; lng: number } | null;
  status: ListingStatus;
  sellerType: SellerType;
  ownerId?: string | null;
  mykNumber?: string | null;
  videoUrl?: string | null;
}

export interface ListingFilters {
  search: string;
  location: string;
  type: 'Tümü' | PropertyType;
  minPrice: string;
  maxPrice: string;
}
