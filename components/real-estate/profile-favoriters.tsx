'use client';

import { useEffect, useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchListingFavoriters, type ListingFavoriter } from '@/lib/real-estate/presence';
import { supabase } from '@/lib/supabase/client';

interface OwnedListing {
  id: string;
  title: string;
}

interface FavoriterEntry extends ListingFavoriter {
  listingId: string;
  listingTitle: string;
}

export function ProfileFavoriters({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(true);
  const [grouped, setGrouped] = useState<{ listing: OwnedListing; favoriters: FavoriterEntry[] }[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data, error } = await supabase.from('listings').select('id, title').eq('user_id', userId);
      if (error || !data) { if (mounted) setBusy(false); return; }
      const listings = data as OwnedListing[];
      const results: { listing: OwnedListing; favoriters: FavoriterEntry[] }[] = [];
      for (const listing of listings) {
        const favoriters = await fetchListingFavoriters(listing.id);
        if (favoriters.length) {
          results.push({
            listing,
            favoriters: favoriters.map((f) => ({ ...f, listingId: listing.id, listingTitle: listing.title })),
          });
        }
      }
      if (mounted) { setGrouped(results); setBusy(false); }
    }
    void load();
    return () => { mounted = false; };
  }, [userId]);

  function toggle(listingId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(listingId)) next.delete(listingId);
      else next.add(listingId);
      return next;
    });
  }

  if (busy || !grouped.length) return null;

  const totalFavoriters = grouped.reduce((sum, group) => sum + group.favoriters.length, 0);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#171720] p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#ffb21a]">İlanlarını kaydedenler</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Favoriye ekleyen kullanıcılar</h2>
        </div>
        <Bookmark className="text-[#f43f68]" size={22} />
      </div>
      <p className="mb-4 text-xs text-[#aaa9b6]">İlanlarını favorilere ekleyen {totalFavoriters} kişi var. Bu bilgi yalnız sana görünür.</p>
      <div className="space-y-3">
        {grouped.map((group) => (
          <div key={group.listing.id} className="rounded-2xl bg-[#20202c]">
            <button onClick={() => toggle(group.listing.id)} className="flex w-full items-center justify-between p-4 text-left">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{group.listing.title}</p>
                <p className="mt-1 text-xs text-[#aaa9b6]">{group.favoriters.length} ki&#351;i favorilere ekledi</p>
              </div>
              {expanded.has(group.listing.id) ? <ChevronUp size={18} className="shrink-0 text-[#aaa9b6]" /> : <ChevronDown size={18} className="shrink-0 text-[#aaa9b6]" />}
            </button>
            {expanded.has(group.listing.id) && (
              <div className="border-t border-white/5 px-4 py-3">
                <ul className="space-y-2">
                  {group.favoriters.map((f) => (
                    <li key={f.userId} className="flex items-center gap-3 text-xs">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f43f68]/15 font-bold text-[#ff9ab0]">{f.displayName.slice(0, 2).toUpperCase()}</div>
                      <span className="min-w-0 flex-1 truncate text-white">{f.displayName}</span>
                      <span className="shrink-0 text-[#777687]">{new Date(f.favoritedAt).toLocaleDateString('tr-TR')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
