'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Check, ChevronLeft, ChevronRight, Expand, Eye, Heart, MapPin, MessageCircle, Play, Share2, Users, X } from 'lucide-react';
import type { Listing, ListingComment } from '@/lib/real-estate/types';
import { supabase } from '@/lib/supabase/client';
import { addListingComment, deleteListingComment, fetchListingComments } from '@/lib/real-estate/comments';
import { computeValueRating } from '@/lib/real-estate/value-rating';
import { ListingValueBadge } from '@/components/real-estate/listing-value-badge';
import { formatMessageTime } from '@/components/real-estate/listing-thread';
import { SellerStrip } from '@/components/real-estate/seller-strip';
import { incrementListingViews } from '@/lib/real-estate/presence';

const ListingLocationMap = dynamic(() => import('@/components/real-estate/listing-location-map').then((m) => m.ListingLocationMap), {
  ssr: false,
  loading: () => <div className="flex h-72 items-center justify-center text-sm text-[#849087]">Harita yükleniyor...</div>,
});

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat('tr-TR').format(value)} TL`;
}

export function ListingDetailPage({ listing, liked, currentUserId, onLike, onMessageSeller, onClose }: { listing: Listing; liked: boolean; currentUserId: string | null; onLike: () => void; onMessageSeller?: () => void; onClose: () => void }) {
  const [slide, setSlide] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [following, setFollowing] = useState(false);
  const [comment, setComment] = useState('');
  const [mapOpen, setMapOpen] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [comments, setComments] = useState<ListingComment[]>([]);
  const [commentError, setCommentError] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [sellerOnline, setSellerOnline] = useState(false);
  const gallery = listing.gallery.length ? listing.gallery : [listing.image];
  const valueRating = computeValueRating(listing);
  const changeSlide = (direction: number) => setSlide((current) => (current + direction + gallery.length) % gallery.length);

  useEffect(() => {
    let active = true;
    fetchListingComments([listing.id])
      .then((items) => { if (active) setComments(items); })
      .catch(() => { if (active) setCommentError('Yorumlar yüklenemedi.'); });
    if (listing.ownerId && listing.ownerId !== currentUserId) {
      void incrementListingViews(listing.id).catch(() => {});
    }
    if (listing.ownerId) {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      void (async () => {
        try {
          const { data } = await supabase.from('user_presence').select('user_id').eq('user_id', listing.ownerId).gt('last_seen', twoMinutesAgo).maybeSingle();
          if (active && data) setSellerOnline(true);
        } catch {}
      })();
    }
    return () => { active = false; };
  }, [listing.id, listing.ownerId, currentUserId]);

  async function reloadComments() {
    try {
      setComments(await fetchListingComments([listing.id]));
      setCommentError('');
    } catch {
      setCommentError('Yorumlar yüklenemedi.');
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim() || commentBusy) return;
    setCommentBusy(true);
    setCommentError('');
    try {
      await addListingComment(listing.id, comment.trim());
      setComment('');
      await reloadComments();
    } catch {
      setCommentError('Yorum gönderilemedi. Tekrar deneyin.');
    } finally {
      setCommentBusy(false);
    }
  }

  async function removeComment(commentId: string) {
    try {
      await deleteListingComment(commentId);
      await reloadComments();
    } catch {
      setCommentError('Yorum silinemedi.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#172018]/70 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="relative max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-t-3xl bg-[#f7f5ef] shadow-2xl dark:bg-[#1f2a23] sm:rounded-3xl">
        <button onClick={onClose} aria-label="Kapat" className="absolute right-5 top-5 z-20 rounded-full bg-black/45 p-2 text-white backdrop-blur"><X size={18} /></button>
        <div className="grid lg:grid-cols-[1.08fr_.92fr]">
          <div className="bg-[#172018] p-3 sm:p-5">
            <div className="relative overflow-hidden rounded-2xl">
              <Image src={gallery[slide]} alt={listing.title} width={1200} height={900} className="aspect-[1.15] w-full object-cover" priority />
              <button onClick={() => setExpanded(true)} className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-[#f43f68]"><Expand size={14} /> Büyüt</button>
              <button onClick={() => changeSlide(-1)} aria-label="Önceki fotoğraf" className="absolute left-4 top-1/2 rounded-full bg-white/90 p-2 text-[#f43f68]"><ChevronLeft size={18} /></button>
              <button onClick={() => changeSlide(1)} aria-label="Sonraki fotoğraf" className="absolute right-4 top-1/2 rounded-full bg-white/90 p-2 text-[#f43f68]"><ChevronRight size={18} /></button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {gallery.map((image, index) => <button key={`${image}-${index}`} onClick={() => setSlide(index)} className={`shrink-0 overflow-hidden rounded-xl border-2 ${slide === index ? 'border-[#d6ae68]' : 'border-transparent opacity-70'}`}><Image src={image} alt={`${listing.title} fotoğrafı ${index + 1}`} width={100} height={74} className="h-16 w-20 object-cover" /></button>)}
            </div>
            {listing.videoUrl && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                {showVideo ? (
                  <video src={listing.videoUrl} controls autoPlay className="aspect-video w-full bg-black object-contain" />
                ) : (
                  <button onClick={() => setShowVideo(true)} className="group relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[#1a2a1f] to-[#0f1a14]">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur-md transition group-hover:scale-110 group-hover:bg-white/25">
                      <Play size={28} className="ml-1 text-white" fill="currentColor" />
                    </span>
                    <span className="absolute bottom-4 text-sm font-semibold text-white/90">İlan videosunu izle</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="px-6 pb-8 sm:px-9">
            <ListingValueBadge rating={valueRating} />
          </div>
          <div className="p-6 sm:p-9">
            <div className="mb-5"><SellerStrip listing={listing} isOnline={sellerOnline} /></div>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#ffb21a]">{listing.type} · {listing.city}, {listing.district}</p><h1 className="display mt-3 text-3xl leading-tight sm:text-4xl">{listing.title}</h1></div>
              <button onClick={onLike} className="rounded-full border border-[#d7ddd6] p-2 text-[#ffb21a]">{liked ? <Heart size={19} fill="currentColor" /> : <Heart size={19} />}</button>
            </div>
            <p className="mt-5 text-3xl font-bold text-[#f43f68]">{formatPrice(listing.price)}</p>
            <div className="my-6 grid grid-cols-3 gap-2 border-y border-black/10 py-5 text-center dark:border-white/10"><div><strong className="block text-lg">{listing.area} m²</strong><span className="text-xs text-[#879189]">Alan</span></div><div><strong className="block text-lg">{listing.rooms}</strong><span className="text-xs text-[#879189]">Oda</span></div><div><strong className="block text-lg">{listing.floor}</strong><span className="text-xs text-[#879189]">Kat</span></div></div>
            <p className="text-sm leading-7 text-[#68746b] dark:text-[#c2ccc3]">{listing.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">{listing.features.map((feature) => <span key={feature} className="rounded-full bg-[#e9efe7] px-3 py-2 text-xs text-[#53645a] dark:bg-white/10 dark:text-[#d7e3d8]">{feature}</span>)}</div>
            <div className="mt-7 flex items-center justify-between rounded-2xl border border-[#dfe6dc] bg-[#eef3ed] p-4"><p className="flex items-center gap-2 text-sm font-semibold"><MapPin size={16} /> Konum</p><span className="text-xs text-[#748078]">{listing.neighborhood}</span></div>
            <div className="mt-5 flex items-center justify-between border-y border-black/10 py-4 text-xs text-[#748078] dark:border-white/10"><button onClick={onLike} className="flex items-center gap-2"><Eye size={16} /> {listing.views.toLocaleString('tr-TR')} görüntülenme</button><button onClick={onLike} className="flex items-center gap-2"><Heart size={16} fill={liked ? 'currentColor' : 'none'} /> {listing.likes}</button><button onClick={() => setFollowing(!following)} className="flex items-center gap-2"><Users size={16} /> {following ? 'Takip ediliyor' : 'Ofisi takip et'}</button><button onClick={() => { if (navigator.share) void navigator.share({ title: listing.title, url: window.location.href }); }} className="flex items-center gap-2"><Share2 size={16} /> Paylaş</button></div>
            <div className="mt-5"><p className="mb-3 flex items-center gap-2 text-sm font-semibold"><MessageCircle size={16} /> Yorumlar <span className="text-xs font-normal text-[#849087]">{comments.length}</span></p>{currentUserId ? <form onSubmit={submitComment} className="flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={500} className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs outline-none dark:border-white/10 dark:bg-white/10" placeholder="İlan hakkında bir şey sor..." /><button disabled={commentBusy} className="rounded-xl bg-[#f43f68] px-4 text-xs font-semibold text-white disabled:opacity-60">Gönder</button></form> : <p className="text-xs text-[#748078]">Yorum yapmak için giriş yapın.</p>}{commentError && <p className="mt-2 text-xs text-[#b42345]">{commentError}</p>}<ul className="mt-4 space-y-3">{comments.map((item) => <li key={item.id} className="rounded-xl bg-white p-3 text-xs dark:bg-white/10"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{item.authorName}</span><span className="text-[10px] text-[#849087]">{formatMessageTime(item.createdAt)}</span></div><p className="mt-1 leading-5 text-[#2d3a31] dark:text-[#d7e3d8]">{item.body}</p>{currentUserId && (item.userId === currentUserId || listing.ownerId === currentUserId) && <button onClick={() => void removeComment(item.id)} className="mt-2 text-[11px] font-semibold text-[#b42345]">Sil</button>}</li>)}</ul></div>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white p-4 dark:bg-white/10"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dbe5da] font-semibold text-[#f43f68]">{listing.agent.initials}</div><div className="flex-1"><p className="text-sm font-semibold">{listing.agent.name} {listing.agent.verified && <Check size={13} className="inline text-[#739277]" />}</p><p className="text-xs text-[#879189]">{listing.sellerType === 'agent' ? listing.agent.office || 'Emlakçı' : 'Mülk sahibi'}</p></div>{onMessageSeller && <button onClick={onMessageSeller} className="rounded-xl bg-[#f43f68] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#d82e57]">Mesaj gönder</button>}</div>
          </div>
        </div>
        {listing.coordinates && (
          <div className="px-6 pb-8 sm:px-9">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold"><MapPin size={16} /> Haritada konum</p>
            {mapOpen ? (
              <div className="relative">
                <ListingLocationMap lat={listing.coordinates.lat} lng={listing.coordinates.lng} />
                <button onClick={() => setMapOpen(false)} aria-label="Haritayı kapat" className="absolute right-3 top-3 z-[500] rounded-full bg-white/90 p-2 text-[#172018] shadow-md transition hover:bg-white"><X size={16} /></button>
              </div>
            ) : (
              <button onClick={() => setMapOpen(true)} className="rounded-xl border border-[#d7ddd6] px-4 py-2.5 text-xs font-semibold text-[#53645a] transition hover:border-[#f43f68]">Haritayı göster</button>
            )}
          </div>
        )}
        {expanded && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-5" onClick={() => setExpanded(false)}><Image src={gallery[slide]} alt={listing.title} width={1600} height={1200} className="max-h-[90vh] w-auto max-w-full object-contain" /><button onClick={(event) => { event.stopPropagation(); changeSlide(-1); }} className="absolute left-5 rounded-full bg-white/90 p-3 text-[#f43f68]"><ChevronLeft /></button><button onClick={(event) => { event.stopPropagation(); changeSlide(1); }} className="absolute right-5 rounded-full bg-white/90 p-3 text-[#f43f68]"><ChevronRight /></button></div>}
      </div>
    </div>
  );
}
