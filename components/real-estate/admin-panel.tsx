'use client';

import { useEffect, useState } from 'react';
import { Check, Clock, ImageOff, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { SellerType } from '@/lib/real-estate/types';

type PendingListing = {
  id: string;
  title: string;
  city: string;
  district: string;
  property_type: string;
  price: number;
  area: number;
  image_urls: string[];
  approval_status: string;
  created_at: string;
  seller_type: SellerType;
  property_number: string | null;
  agent_office_name: string | null;
  agent_authority_number: string | null;
  agent_myk_number: string | null;
  authority_document_path: string | null;
};

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    setLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('id, title, city, district, property_type, price, area, image_urls, approval_status, created_at, seller_type, property_number, agent_office_name, agent_authority_number, agent_myk_number, authority_document_path')
      .in('approval_status', ['pending', 'rejected'])
      .order('created_at', { ascending: false });
    setListings((data ?? []) as PendingListing[]);
    setLoading(false);
  }

  async function openAuthorityDoc(path: string | null) {
    if (!path) return;
    setDocError(null);
    const win = window.open('', '_blank');
    const { data, error } = await supabase.storage.from('listing-authority-docs').createSignedUrl(path, 300);
    if (error || !data?.signedUrl) {
      win?.close();
      setDocError('Yetki belgesi açılamadı. Lütfen tekrar deneyin.');
      return;
    }
    if (win) win.location.href = data.signedUrl;
    else window.location.href = data.signedUrl;
  }

  async function approve(id: string) {
    setBusy(id);
    const { error } = await supabase.rpc('approve_listing', { target_id: id });
    if (!error) setListings((current) => current.filter((l) => l.id !== id));
    setBusy(null);
  }

  async function reject(id: string) {
    setBusy(id);
    const reason = (rejectReasons[id] ?? '').trim();
    const { error } = await supabase.rpc('reject_listing', { target_id: id, reason: reason || null });
    if (!error) {
      setListings((current) => current.filter((l) => l.id !== id));
      setRejectReasons((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
    setBusy(null);
  }

  const fmtPrice = (price: number) => new Intl.NumberFormat('tr-TR').format(price);

  return (
    <section className="mx-auto max-w-5xl py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-[#ffb21a]">Yönetim</p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">İlan Onay Paneli</h1>
          <p className="mt-3 text-sm text-[#aaa9b6]">Yüklenen ilanları ve fotoğrafları inceleyip onaylayın.</p>
        </div>
        <button onClick={onClose} className="rounded-full border border-white/10 p-3 text-[#aaa9b6]" aria-label="Kapat">
          <X size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm text-[#aaa9b6]">
          <Loader2 size={20} className="mr-2 animate-spin" /> İlanlar yükleniyor...
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#171720] py-20 text-center">
          <Check size={40} className="mb-3 text-[#4ade80]" />
          <p className="text-lg font-semibold text-white">Onay bekleyen ilan yok</p>
          <p className="mt-2 text-sm text-[#aaa9b6]">Tüm ilanlar incelendi. Yeni ilan geldiğinde burada görünecek.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {docError && <p className="rounded-xl bg-[#f43f68]/15 px-4 py-3 text-sm text-[#f43f68]">{docError}</p>}
          {listings.map((listing) => (
            <div key={listing.id} className="rounded-3xl border border-white/10 bg-[#171720] p-5">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex h-32 w-full gap-2 overflow-x-auto rounded-2xl sm:w-80">
                  {listing.image_urls && listing.image_urls.length > 0 ? (
                    listing.image_urls.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt={`Fotoğraf ${i + 1}`} className="h-32 w-24 shrink-0 rounded-xl object-cover" />
                    ))
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-2xl bg-[#20202c] text-[#777687]">
                      <ImageOff size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${listing.approval_status === 'pending' ? 'bg-[#ffb21a]/15 text-[#ffb21a]' : 'bg-[#f43f68]/15 text-[#f43f68]'}`}>
                      {listing.approval_status === 'pending' ? 'Onay bekliyor' : 'Reddedildi'}
                    </span>
                    <span className="text-xs text-[#777687]">{new Date(listing.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{listing.title}</h3>
                  <p className="mt-1 text-sm text-[#aaa9b6]">{listing.property_type} · {listing.city} / {listing.district}</p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-[#aaa9b6]">
                    <span className="font-bold text-[#f43f68]">{fmtPrice(listing.price)} TL</span>
                    <span>{listing.area} m²</span>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#20202c] p-4 text-sm">
                    <p className={`mb-2 font-semibold ${listing.seller_type === 'agent' ? 'text-[#ffb21a]' : 'text-[#4ade80]'}`}>
                      {listing.seller_type === 'agent' ? 'Emlakçı ilanı' : 'Mülk sahibi ilanı'}
                    </p>
                    <p className="text-[#aaa9b6]">Taşınmaz no: <span className="font-semibold text-white">{listing.property_number || '-'}</span></p>
                    {listing.seller_type === 'agent' && (
                      <div className="mt-2 space-y-1 text-[#aaa9b6]">
                        <p>Ofis: <span className="text-white">{listing.agent_office_name || '-'}</span></p>
                        <p>Yetki belge no: <span className="text-white">{listing.agent_authority_number || '-'}</span></p>
                        <p>MYK no: <span className="text-white">{listing.agent_myk_number || '-'}</span></p>
                        <p className="pt-1 text-xs text-[#777687]">Taşınmaz numarasını ve yetki belge numarasını belgeyle çapraz kontrol edin.</p>
                        <button
                          onClick={() => void openAuthorityDoc(listing.authority_document_path)}
                          disabled={!listing.authority_document_path}
                          className="mt-2 rounded-xl bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
                        >
                          Yetki belgesini aç
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-[#aaa9b6]">
                      Red nedeni (reddedilirse ilan sahibi görür)
                      <input
                        value={rejectReasons[listing.id] ?? ''}
                        onChange={(event) => setRejectReasons((current) => ({ ...current, [listing.id]: event.target.value }))}
                        maxLength={500}
                        placeholder="Örn: Yetki belgesi okunamıyor"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#20202c] px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-[#f43f68]"
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => void approve(listing.id)}
                      disabled={busy === listing.id}
                      className="flex items-center gap-2 rounded-xl bg-[#4ade80]/15 px-4 py-2.5 text-sm font-semibold text-[#4ade80] transition hover:bg-[#4ade80]/25 disabled:opacity-50"
                    >
                      {busy === listing.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Onayla
                    </button>
                    <button
                      onClick={() => void reject(listing.id)}
                      disabled={busy === listing.id}
                      className="flex items-center gap-2 rounded-xl bg-[#f43f68]/15 px-4 py-2.5 text-sm font-semibold text-[#f43f68] transition hover:bg-[#f43f68]/25 disabled:opacity-50"
                    >
                      {busy === listing.id ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                      Reddet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
