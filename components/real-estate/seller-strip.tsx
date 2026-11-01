import { MapPin } from 'lucide-react';
import type { Listing } from '@/lib/real-estate/types';

export function SellerStrip({ listing, isOnline }: { listing: Listing; isOnline?: boolean }) {
  const isAgent = listing.sellerType === 'agent';
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
      <span className="text-sm font-semibold">{listing.agent.name}</span>
      {isOnline && <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,.6)]" title="Online" />}
      <span className={`rounded-full px-2.5 py-1 font-bold ${isAgent ? 'bg-[#ffb21a] text-[#2b1d00]' : 'bg-[#2f7d5b] text-white'}`}>{isAgent ? 'Emlakçı' : 'Mülk sahibi'}</span>
      {isAgent && listing.agent.office && <span className="text-[#68746b] dark:text-[#c2ccc3]">{listing.agent.office}</span>}
      <span className="flex items-center gap-1 text-[#68746b] dark:text-[#c2ccc3]"><MapPin size={12} />{listing.city} / {listing.district}</span>
      {isAgent && listing.mykNumber && <span className="rounded-lg bg-[#e9efe7] px-2 py-1 font-semibold text-[#334c3a]">MYK No: {listing.mykNumber}</span>}
    </div>
  );
}
