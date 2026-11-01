'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ImageOff, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  deleteOwnedListing,
  fetchOwnedListingDetail,
  fetchOwnedListings,
  setOwnedListingStatus,
  type ListingStatus,
  type OwnedListing,
  type OwnedListingDetail,
} from '@/lib/real-estate/owner-listings';
import { ListingForm } from '@/components/real-estate/listing-form';

const priceFormatter = new Intl.NumberFormat('tr-TR');

export function ProfileListingsSection({ userId }: { userId: string }) {
  const [listings, setListings] = useState<OwnedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<OwnedListingDetail | null>(null);

  const loadListings = useCallback(() => {
    return fetchOwnedListings(userId)
      .then((rows) => setListings(rows))
      .catch(() => setMessage('İlanların yüklenemedi. Sayfayı yenileyip tekrar deneyin.'));
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    loadListings().finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [loadListings]);

  async function openEdit(listing: OwnedListing) {
    setBusyId(listing.id);
    setMessage(null);
    try {
      const detail = await fetchOwnedListingDetail(listing.id);
      if (detail) setEditTarget(detail);
      else setMessage('İlan bulunamadı. Sayfayı yenileyip tekrar deneyin.');
    } catch {
      setMessage('İlan bilgileri yüklenemedi.');
    } finally {
      setBusyId(null);
    }
  }

  async function changeStatus(listing: OwnedListing, status: ListingStatus) {
    setBusyId(listing.id);
    setMessage(null);
    try {
      await setOwnedListingStatus(listing.id, status);
      setListings((current) => current.map((row) => (row.id === listing.id ? { ...row, status } : row)));
    } catch {
      setMessage('İlan durumu güncellenemedi.');
    } finally {
      setBusyId(null);
    }
  }

  async function removeListing(listing: OwnedListing) {
    if (!window.confirm(`"${listing.title}" ilanı kalıcı olarak silinsin mi?`)) return;
    setBusyId(listing.id);
    setMessage(null);
    try {
      await deleteOwnedListing(listing.id);
      setListings((current) => current.filter((row) => row.id !== listing.id));
    } catch {
      setMessage('İlan silinemedi.');
    } finally {
      setBusyId(null);
    }
  }

  const active = listings.filter((listing) => listing.approval_status === 'approved' && listing.status === 'active');
  const passive = listings.filter((listing) => listing.approval_status === 'approved' && listing.status === 'passive');
  const pending = listings.filter((listing) => listing.approval_status === 'pending');
  const rejected = listings.filter((listing) => listing.approval_status === 'rejected');

  const renderActions = (listing: OwnedListing, toggle?: { label: string; status: ListingStatus }) => (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        onClick={() => void openEdit(listing)}
        disabled={busyId === listing.id}
        className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
      >
        <Pencil size={13} />
        Düzenle
      </button>
      {toggle && (
        <button
          onClick={() => void changeStatus(listing, toggle.status)}
          disabled={busyId === listing.id}
          className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
        >
          {toggle.label}
        </button>
      )}
      <button
        onClick={() => void removeListing(listing)}
        disabled={busyId === listing.id}
        className="flex items-center gap-1.5 rounded-xl bg-[#f43f68]/15 px-3 py-2 text-xs font-semibold text-[#f43f68] transition hover:bg-[#f43f68]/25 disabled:opacity-50"
      >
        {busyId === listing.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        Sil
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[#171720] p-6">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#ffb21a]">İlanlarım</p>
        <h2 className="mt-1 text-2xl font-bold text-white">İlan yönetimi</h2>
        <p className="mt-2 text-sm text-[#aaa9b6]">Aktif ilanlarını pasife alabilir, pasif ilanlarını yeniden yayınlayabilir veya silebilirsin.</p>
        {message && <p className="mt-4 rounded-xl bg-[#f43f68]/15 px-4 py-3 text-sm text-[#ffb5c5]">{message}</p>}
        {loading && <p className="mt-4 flex items-center gap-2 text-sm text-[#aaa9b6]"><Loader2 size={15} className="animate-spin" /> İlanların yükleniyor...</p>}
      </div>

      {editTarget && (
        <ListingForm
          editing={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => void loadListings()}
        />
      )}

      {!loading && (
        <>
          <ListingGroup title="Aktif ilanlar" count={active.length} emptyText="Yayında olan aktif ilanın yok.">
            {active.map((listing) => (
              <ListingRow key={listing.id} listing={listing} badge={{ label: 'Yayında', className: 'bg-[#4ade80]/15 text-[#4ade80]' }}>
                {renderActions(listing, { label: 'Pasife al', status: 'passive' })}
              </ListingRow>
            ))}
          </ListingGroup>

          <ListingGroup title="Pasif ilanlar" count={passive.length} emptyText="Pasif ilanın yok. Pasife aldığın ilanlar burada görünür ve sitede gizlenir.">
            {passive.map((listing) => (
              <ListingRow key={listing.id} listing={listing} badge={{ label: 'Pasif', className: 'bg-white/10 text-[#aaa9b6]' }}>
                {renderActions(listing, { label: 'Aktife al', status: 'active' })}
              </ListingRow>
            ))}
          </ListingGroup>

          <ListingGroup title="Onay bekleyen ilanlar" count={pending.length} emptyText="Onay bekleyen ilanın yok.">
            {pending.map((listing) => (
              <ListingRow key={listing.id} listing={listing} badge={{ label: 'Onay bekliyor', className: 'bg-[#ffb21a]/15 text-[#ffb21a]' }}>
                {renderActions(listing)}
              </ListingRow>
            ))}
          </ListingGroup>

          <ListingGroup title="Reddedilen ilanlar" count={rejected.length} emptyText="Reddedilen ilanın yok.">
            {rejected.map((listing) => (
              <ListingRow key={listing.id} listing={listing} badge={{ label: 'Reddedildi', className: 'bg-[#f43f68]/15 text-[#f43f68]' }}>
                <div className="mt-3 rounded-xl bg-[#f43f68]/10 px-3 py-2 text-xs leading-5 text-[#ffb5c5]">
                  <span className="font-semibold">Red nedeni: </span>
                  {listing.rejection_reason || 'Belirtilmedi'}
                </div>
                {renderActions(listing)}
              </ListingRow>
            ))}
          </ListingGroup>
        </>
      )}
    </div>
  );
}

function ListingGroup({ title, count, emptyText, children }: { title: string; count: number; emptyText: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#171720] p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-[#aaa9b6]">{count}</span>
      </div>
      {count === 0 ? <p className="rounded-2xl bg-[#20202c] p-4 text-sm text-[#aaa9b6]">{emptyText}</p> : <div className="space-y-3">{children}</div>}
    </div>
  );
}

function ListingRow({ listing, badge, children }: { listing: OwnedListing; badge: { label: string; className: string }; children: ReactNode }) {
  const cover = listing.image_urls?.[0];
  return (
    <div className="rounded-2xl bg-[#20202c] p-3">
      <div className="flex items-center gap-3">
        {cover ? (
          <img src={cover} alt={listing.title} className="h-14 w-16 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-[#171720] text-[#777687]">
            <ImageOff size={18} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{listing.title}</p>
          <p className="truncate text-xs text-[#aaa9b6]">{listing.property_type} · {listing.city} / {listing.district}</p>
          <p className="mt-1 text-xs text-[#ff9ab0]">{priceFormatter.format(Number(listing.price))} TL</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
      </div>
      {children}
    </div>
  );
}
