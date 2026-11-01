'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import Image from 'next/image';
import { Bell, Bookmark, ChevronRight, Eye, Heart, LogIn, Maximize2, MapPin, Menu, Minimize2, MessageCircle, Moon, Plus, Search, Send, Share2, SlidersHorizontal, Sparkles, Sun, UserRound, Users, X } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapExplorer = dynamic(() => import('@/components/real-estate/map-explorer').then((m) => m.MapExplorer), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-[#aaa9b6]">Harita yükleniyor...</div>,
});
import { filterListings, listings } from '@/lib/real-estate/listings';
import { AuthDialog } from '@/components/real-estate/auth-dialog';
import { ListingForm as ListingFormPanel } from '@/components/real-estate/listing-form';
import { LocationPicker } from '@/components/real-estate/location-picker';
import { ListingDetailPage } from '@/components/real-estate/listing-detail';
import { ListingCommentsPreview } from '@/components/real-estate/listing-comments-preview';
import { SellerStrip } from '@/components/real-estate/seller-strip';
import { ListingThread, type ThreadTarget } from '@/components/real-estate/listing-thread';
import { NotificationsPanel } from '@/components/real-estate/notifications-panel';
import { fetchApprovedListings } from '@/lib/real-estate/listing-feed';
import { fetchLikeState, fetchUnreadCount, setListingLiked } from '@/lib/real-estate/messaging';
import { AiHub } from '@/components/real-estate/ai-hub';
import { ChatRooms } from '@/components/real-estate/chat-rooms';
import { SupportLine } from '@/components/real-estate/support-line';
import { formatPrice } from '@/lib/real-estate/format-price';
import { SwipeableGallery } from '@/components/real-estate/swipeable-gallery';
import { ListingValueBadge } from '@/components/real-estate/listing-value-badge';
import { computeValueRating } from '@/lib/real-estate/value-rating';
import { MapPin as MapPinIcon } from 'lucide-react';
import { ProfilePage } from '@/components/real-estate/profile-page';
import { AdminPanel } from '@/components/real-estate/admin-panel';
import { supabase } from '@/lib/supabase/client';
import { heartbeat, fetchOnlineUserIds, fetchSiteStats, fetchFavoriteCounts, incrementListingViews, type SiteStats } from '@/lib/real-estate/presence';
import type { Session } from '@supabase/supabase-js';
import type { Listing, ListingFilters } from '@/lib/real-estate/types';
import { allPropertyTypeOptions, commercialPropertyTypes, type PropertyType } from '@/lib/real-estate/property-types';

const propertyTypes: Array<'Tümü' | PropertyType> = ['Tümü', ...allPropertyTypeOptions];
const exploreCategories: Array<{ type: 'Tümü' | PropertyType; label: string; image: string }> = [
  { type: 'Tümü', label: 'Hepsi', image: '/logo.jpg' },
  { type: 'Daire', label: 'Daireler', image: 'https://images.pexels.com/photos/8089172/pexels-photo-8089172.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { type: 'Villa', label: 'Villalar', image: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { type: 'Günlük Kiralık', label: 'Günlük kiralık', image: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { type: 'Ofis', label: 'Ofisler', image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { type: 'Arsa', label: 'Arsalar', image: 'https://images.pexels.com/photos/280222/pexels-photo-280222.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { type: 'Butik Otel', label: 'Butik otel', image: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { type: 'Bungalow', label: 'Bungalow', image: 'https://images.pexels.com/photos/803975/pexels-photo-803975.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { type: 'Tiny House', label: 'Tiny house', image: 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { type: 'Ticari Gayrimenkul', label: 'Ticari', image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

export default function HomeShell() {
  const [filters, setFilters] = useState<ListingFilters>({ search: '', location: '', type: 'Tümü', minPrice: '', maxPrice: '' });
  const [activeTab, setActiveTab] = useState<'feed' | 'map' | 'ai' | 'chat' | 'dashboard' | 'profile' | 'admin'>('feed');
  const [selected, setSelected] = useState<Listing | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [dark, setDark] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'reset'>('login');
  const isAdmin = session?.user?.email === 'hakan1000gol@gmail.com';
  const authorName = session?.user?.email?.split('@')[0] || 'Kullanıcı';
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [thread, setThread] = useState<ThreadTarget | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [siteStats, setSiteStats] = useState<SiteStats>({ totalUsers: 0, onlineUsers: 0 });
  const [statsVisible, setStatsVisible] = useState(false);
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>({});
  const allListings = useMemo(() => [...dbListings.map((item) => ({ ...item, likes: likeCounts[item.id] ?? 0, views: item.views ?? 0 })), ...listings], [dbListings, likeCounts]);
  const results = useMemo(() => filterListings(allListings, filters), [allListings, filters]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setSession(data.session); });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
        setShowAuth(true);
      }
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) { setSaved([]); return; }
    let mounted = true;
    supabase.from('user_favorites').select('listing_key').eq('user_id', session.user.id).then(({ data }) => {
      if (mounted) setSaved((data ?? []).map((item: { listing_key: string }) => item.listing_key));
    });
    return () => { mounted = false; };
  }, [session]);

  useEffect(() => {
    let mounted = true;
    fetchApprovedListings().then((items) => { if (mounted) setDbListings(items); }).catch((cause) => console.error('listing feed failed', cause));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    function refreshStats() {
      fetchSiteStats().then((stats) => { if (mounted) setSiteStats(stats); }).catch(() => {});
      fetchOnlineUserIds().then((ids) => { if (mounted) setOnlineUserIds(ids); }).catch(() => {});
      fetchFavoriteCounts().then((counts) => { if (mounted) setFavoriteCounts(counts); }).catch(() => {});
    }
    refreshStats();
    const interval = setInterval(refreshStats, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!session) return;
    let mounted = true;
    function ping() { heartbeat(session!.user.id).catch(() => {}); }
    ping();
    const interval = setInterval(ping, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, [session]);

  useEffect(() => {
    if (!session) { setLiked([]); setLikeCounts({}); setUnreadCount(0); return; }
    let mounted = true;
    fetchLikeState(session.user.id).then((state) => { if (mounted) { setLiked(state.likedIds); setLikeCounts(state.counts); } }).catch((cause) => console.error('likes load failed', cause));
    fetchUnreadCount(session.user.id).then((count) => { if (mounted) setUnreadCount(count); }).catch((cause) => console.error('unread count failed', cause));
    return () => { mounted = false; };
  }, [session]);

  const toggleList = (id: string, setter: Dispatch<SetStateAction<string[]>>) => setter((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleFavorite = async (id: string) => {
    if (!session) { setShowAuth(true); return; }
    const isSaved = saved.includes(id);
    const result = isSaved ? await supabase.from('user_favorites').delete().eq('listing_key', id).eq('user_id', session.user.id) : await supabase.from('user_favorites').insert({ listing_key: id });
    if (!result.error) setSaved((current) => isSaved ? current.filter((item) => item !== id) : [...current, id]);
  };
  const requireAuth = (action: () => void) => { if (!session) { setShowAuth(true); return; } action(); };
  const startListing = () => { if (session) setShowForm(true); else setShowAuth(true); };
  const refreshUnreadCount = (userId: string) => { void fetchUnreadCount(userId).then(setUnreadCount).catch((cause) => console.error('unread count failed', cause)); };
  const toggleLike = (id: string) => {
    if (!session) { setShowAuth(true); return; }
    if (!dbListings.some((item) => item.id === id)) { toggleList(id, setLiked); return; }
    const isLiked = liked.includes(id);
    void setListingLiked(id, !isLiked).then(() => {
      setLiked((current) => isLiked ? current.filter((item) => item !== id) : [...current, id]);
      setLikeCounts((current) => ({ ...current, [id]: Math.max(0, (current[id] ?? 0) + (isLiked ? -1 : 1)) }));
    }).catch((cause) => console.error('like update failed', cause));
  };
  const openSellerThread = (listing: Listing) => {
    if (!session) { setShowAuth(true); return; }
    setThread({ listingId: listing.id, listingTitle: listing.title, buyerId: session.user.id });
  };
  const updateFilter = (key: keyof ListingFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className={dark ? 'dark min-h-screen bg-[#0d0d13] text-[#f7f7fa]' : 'min-h-screen bg-[#f7f5ef] text-[#222622]'}>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0d13]/95 backdrop-blur-xl dark:border-white/10 dark:bg-[#0d0d13]/95">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 lg:px-10">
          <button onClick={() => setActiveTab('feed')} className="flex items-center gap-3" aria-label="EMLAKTAKAZAN ana sayfa">
            <Image src="/logo.jpg" alt="EMLAKTAKAZAN" width={44} height={44} className="rounded-xl object-cover shadow-md" />
            <span className="hidden text-[15px] font-bold tracking-[.2em] sm:block">EMLAKTAKAZAN</span>
          </button>
          <nav className="hidden items-center gap-7 text-[13px] font-medium text-[#667069] lg:flex dark:text-[#c2ccc3]">
            <button onClick={() => setActiveTab('feed')} className={activeTab === 'feed' ? 'text-[#f43f68] dark:text-white' : 'hover:text-[#f43f68]'}>Keşfet</button>
            <button onClick={() => setActiveTab('map')} className={activeTab === 'map' ? 'text-[#f43f68] dark:text-white' : 'hover:text-[#f43f68]'}>Haritada keşfet</button>
            <button onClick={() => setActiveTab('ai')} className={`flex items-center gap-1.5 ${activeTab === 'ai' ? 'text-[#f43f68] dark:text-white' : 'hover:text-[#f43f68]'}`}><Sparkles size={14} />Yapay zeka</button><button onClick={() => setActiveTab('chat')} className={activeTab === 'chat' ? 'text-[#f43f68] dark:text-white' : 'hover:text-[#f43f68]'}>Sohbet</button>
            <button onClick={() => { if (session) setActiveTab('dashboard'); else setShowAuth(true); }} className={activeTab === 'dashboard' ? 'text-[#f43f68] dark:text-white' : 'hover:text-[#f43f68]'}>Ofisim</button>
            {isAdmin && <button onClick={() => setActiveTab('admin')} className={activeTab === 'admin' ? 'text-[#f43f68] dark:text-white' : 'hover:text-[#f43f68]'}>Admin</button>}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => setDark(!dark)} className="rounded-full p-2.5 text-[#6a746c] transition hover:bg-black/5" aria-label="Tema değiştir">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            {session && <button onClick={() => setNotificationsOpen(true)} className="relative rounded-full p-2.5 text-[#6a746c] transition hover:bg-black/5" aria-label="Bildirimler"><Bell size={18} />{unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f43f68] px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button>}
            {session ? <><button onClick={() => setActiveTab('profile')} className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2.5 text-xs font-semibold text-[#aaa9b6] transition hover:border-[#f43f68] hover:text-white sm:px-4 sm:py-3"><UserRound size={15} /><span className="hidden sm:inline">Profil</span></button><button onClick={() => void supabase.auth.signOut()} className="hidden items-center gap-2 rounded-full border border-[#cdd5cc] px-4 py-3 text-xs font-semibold text-[#53645a] sm:flex">Çıkış yap</button></> : <button onClick={() => setShowAuth(true)} className="flex items-center gap-2 rounded-full border border-[#cdd5cc] px-3 py-2.5 text-xs font-semibold text-[#53645a] transition hover:border-[#f43f68] hover:text-[#f43f68] sm:px-4 sm:py-3"><LogIn size={15} /><span className="hidden sm:inline">Giriş yap</span></button>}<button onClick={() => setActiveTab('ai')} aria-label="Yapay zeka emlak analizi" className="rounded-full p-2.5 text-[#ffb21a] transition hover:bg-white/10"><Sparkles size={18} /></button><button onClick={startListing} aria-label="İlan ver" title="İlan ver" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f43f68] text-white shadow-lg shadow-[#f43f68]/20 transition hover:-translate-y-0.5 hover:bg-[#d82e57]"><Plus size={18} /></button>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="rounded-full p-2 text-[#f43f68] lg:hidden" aria-label="Menü"><Menu size={21} /></button>
          </div>
        </div>
        {mobileMenu && <div className="border-t border-black/5 bg-inherit px-5 py-4 lg:hidden"><div className="flex flex-col gap-4 text-sm font-medium"><button onClick={() => { setActiveTab('feed'); setMobileMenu(false); }}>Keşfet</button><button onClick={() => { setActiveTab('map'); setMobileMenu(false); }}>Haritada keşfet</button><button onClick={() => { setActiveTab('ai'); setMobileMenu(false); }}>Yapay zeka</button><button onClick={() => { setActiveTab('chat'); setMobileMenu(false); }}>Sohbet odaları</button><button onClick={() => { startListing(); setMobileMenu(false); }} className="flex flex-col items-start gap-1 text-left"><span>Yeni ilan ver</span><span className="text-xs font-normal leading-5 text-[#77827a]">Sahibinden ilan linkini yapıştır, bilgiler formu doldursun. Kontrol edip onaya gönder.</span></button>{session && <button onClick={() => { setActiveTab('profile'); setMobileMenu(false); }}>Profilim ve favorilerim</button>}{isAdmin && <button onClick={() => { setActiveTab('admin'); setMobileMenu(false); }}>Admin paneli</button>}</div></div>}
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-20 lg:px-10">
        {activeTab === 'admin' && isAdmin ? <AdminPanel onClose={() => setActiveTab('feed')} /> : activeTab === 'profile' && session ? <ProfilePage user={session.user} favoriteCount={saved.length} onSignOut={() => { void supabase.auth.signOut(); setActiveTab('feed'); }} onClose={() => setActiveTab('feed')} /> : activeTab === 'chat' ? <ChatRooms authorName={authorName} currentUserId={session?.user.id ?? null} onRequireAuth={() => setShowAuth(true)} /> : activeTab === 'ai' ? <AiHub onOpenListing={(listing) => setSelected(listing)} /> : activeTab === 'dashboard' ? <Dashboard onNew={startListing} /> : activeTab === 'map' ? <><section className={mapFullscreen ? 'fixed inset-x-0 bottom-0 top-[76px] z-30 bg-[#0d0d13] p-3' : 'pt-6'}><div className={`relative overflow-hidden rounded-3xl shadow-inner ${mapFullscreen ? 'h-full' : 'h-[calc(100vh-112px)] min-h-[520px]'}`}><MapExplorer listings={results} onSelect={setSelected} /></div></section><button onClick={() => setMapFullscreen(!mapFullscreen)} className="fixed bottom-6 right-[15rem] z-40 flex items-center gap-2 rounded-full border border-white/10 bg-[#171720] px-5 py-3 text-xs font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:border-[#f43f68]">{mapFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{mapFullscreen ? 'Küçült' : 'Harita görünümü'}</button></> : <>
          <section className="mb-10 rounded-3xl border border-white/10 bg-[#171720] p-4 shadow-[0_18px_50px_rgba(0,0,0,.3)] sm:p-6">
            <div className="mb-4 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f43f68]/15 text-[#f43f68]"><SlidersHorizontal size={25} /></span><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#ffb21a]">İlan filtrele</p><h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">Aradığın gayrimenkulü bul</h1></div></div>
            <div className="grid gap-3 md:grid-cols-[1.25fr_1fr_1fr_auto]"><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#20202c] px-4 py-3.5"><Search size={22} className="text-[#ffb21a]" /><input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} onFocus={() => setSearchOpen(true)} className="w-full bg-transparent text-sm outline-none placeholder:text-[#89938c]" placeholder="Ne arıyorsun?" /></div><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#20202c] px-4 py-3.5"><MapPin size={22} className="text-[#ffb21a]" /><input value={filters.location} onChange={(e) => updateFilter('location', e.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-[#89938c]" placeholder="İl veya ilçe" /></div><select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)} className="rounded-2xl border border-white/10 bg-[#20202c] px-4 text-sm outline-none"><option value="Tümü">Tüm ilanlar</option>{propertyTypes.slice(1).map((type) => <option key={type} value={type}>{type}</option>)}</select><button onClick={() => setSearchOpen(false)} className="flex items-center justify-center gap-2 rounded-2xl bg-[#f43f68] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#d82e57]"><Search size={20} /> Ara</button></div><div className="mt-3"><LocationPicker onChange={(value) => updateFilter('location', value)} /></div>{searchOpen && <div className="relative mt-2 rounded-xl border border-white/10 bg-[#20202c] p-4 text-sm shadow-2xl"><div className="mb-3 flex items-center justify-between text-xs font-semibold text-[#aaa9b6]"><span>Hızlı filtreler</span><button onClick={() => setSearchOpen(false)}><X size={15} /></button></div><div className="flex flex-wrap gap-2">{['İstanbul', 'İzmir', 'Villa', 'Yatırımlık'].map((item) => <button key={item} onClick={() => { updateFilter(item === 'Villa' ? 'type' : 'location', item === 'Yatırımlık' ? 'Arsa' : item); setSearchOpen(false); }} className="rounded-full bg-white/10 px-3 py-2 text-xs text-white">{item}</button>)}</div></div>}<div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{propertyTypes.filter((type) => !commercialPropertyTypes.includes(type as typeof commercialPropertyTypes[number])).map((type) => <button key={type} onClick={() => updateFilter('type', type)} className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-semibold transition ${filters.type === type ? 'border-[#f43f68] bg-[#f43f68] text-white' : 'border-white/10 bg-[#20202c] text-[#aaa9b6] hover:border-[#f43f68]'}`}>{type === 'Tümü' ? 'Tüm ilanlar' : type}</button>)}</div>{filters.type === 'Ticari Gayrimenkul' && <div className="mt-3 rounded-2xl border border-[#ffb21a]/30 bg-[#ffb21a]/5 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-[.14em] text-[#ffb21a]">Ticari alt türler</p><div className="flex flex-wrap gap-2">{commercialPropertyTypes.map((type) => <button key={type} onClick={() => updateFilter('type', type)} className="rounded-full border border-white/10 bg-[#20202c] px-3 py-2 text-xs text-white transition hover:border-[#f43f68]">{type}</button>)}</div></div>}
          </section>
          <ExploreRail activeType={filters.type} onSelect={(type) => updateFilter('type', type)} onMap={() => setActiveTab('map')} />

          <section className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-[#ffb21a]">Editörün seçimi</p><h2 className="display text-3xl tracking-[-.02em] sm:text-4xl">Bugünün vitrin ilanları</h2></div><button onClick={() => setActiveTab('map')} className="flex items-center gap-2 self-start rounded-full border border-[#cdd5cc] px-4 py-2.5 text-xs font-semibold text-[#53645a] transition hover:border-[#f43f68] sm:self-auto">Tümünü haritada gör <ChevronRight size={15} /></button></section>
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {results.filter((item) => item.isFeatured).map((item, index) => <ListingCard key={item.id} listing={item} index={index} isLiked={liked.includes(item.id)} isSaved={saved.includes(item.id)} favoriteCount={favoriteCounts[item.id] ?? 0} isSellerOnline={item.ownerId ? onlineUserIds.has(item.ownerId) : false} onLike={() => toggleLike(item.id)} onSave={() => void toggleFavorite(item.id)} onOpen={() => { setSelected(item); if (item.ownerId !== session?.user.id) void incrementListingViews(item.id).catch(() => {}); }} />)}
          </section>
          <section className="mb-9 mt-16 flex items-end justify-between"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-[#ffb21a]">Sana özel</p><h2 className="display text-3xl tracking-[-.02em]">Keşfetmeye devam et</h2></div><span className="hidden text-xs text-[#7b867e] sm:block">{results.length} ilan gösteriliyor</span></section>
          <section className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{results.filter((item) => !item.isFeatured).map((item, index) => <ListingCard key={item.id} listing={item} index={index} isLiked={liked.includes(item.id)} isSaved={saved.includes(item.id)} favoriteCount={favoriteCounts[item.id] ?? 0} isSellerOnline={item.ownerId ? onlineUserIds.has(item.ownerId) : false} compact onLike={() => toggleLike(item.id)} onSave={() => void toggleFavorite(item.id)} onOpen={() => { setSelected(item); if (item.ownerId !== session?.user.id) void incrementListingViews(item.id).catch(() => {}); }} />)}</section>
        </>}
      </main>
      {activeTab === 'feed' && (
        <button
          onClick={() => setActiveTab('map')}
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#f43f68] px-6 py-3.5 text-sm font-bold text-white shadow-2xl shadow-[#f43f68]/30 transition hover:-translate-y-1 hover:bg-[#d82e57] sm:bottom-8"
          aria-label="İlanları haritada göster"
        >
          <MapPinIcon size={18} fill="currentColor" />
          İlanları haritada göster
        </button>
      )}
      {activeTab === 'feed' && (
        <div className={`fixed bottom-6 right-5 z-40 flex items-center gap-2 sm:bottom-8 sm:right-8 ${statsVisible ? 'rounded-2xl bg-[#171720] px-4 py-3 shadow-xl' : ''}`}>
          <button onClick={() => setStatsVisible(!statsVisible)} aria-label="Kullanıcı istatistikleri" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#171720] text-white shadow-lg transition hover:border-[#f43f68]">
            <Users size={18} />
          </button>
          {statsVisible && (
            <div className="flex items-center gap-4 text-xs text-white">
              <span className="flex items-center gap-1.5"><Users size={14} className="text-[#ffb21a]" /> {siteStats.totalUsers.toLocaleString('tr-TR')} üye</span>
              <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,.6)]" /> {siteStats.onlineUsers.toLocaleString('tr-TR')} online</span>
            </div>
          )}
        </div>
      )}
      <footer className="border-t border-black/5 px-5 py-8 dark:border-white/10"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-4 text-xs text-[#7d877f] sm:flex-row"><span className="font-semibold tracking-[.16em] text-[#526257]">EMLAKTAKAZAN</span><span>Güvenle keşfet, doğru yatırım yap.</span><span>© 2025 EMLAKTAKAZAN</span></div></footer>
      <SupportLine />
      {selected && <ListingDetailPage listing={selected} liked={liked.includes(selected.id)} currentUserId={session?.user.id ?? null} onLike={() => toggleLike(selected.id)} onMessageSeller={selected.ownerId && selected.ownerId !== session?.user.id ? () => openSellerThread(selected) : undefined} onClose={() => setSelected(null)} />}
      {thread && session && <ListingThread listingId={thread.listingId} listingTitle={thread.listingTitle} buyerId={thread.buyerId} currentUserId={session.user.id} onClose={() => { setThread(null); refreshUnreadCount(session.user.id); }} />}
      {notificationsOpen && session && <NotificationsPanel userId={session.user.id} onOpenThread={(target) => { setNotificationsOpen(false); setThread(target); }} onClose={() => { setNotificationsOpen(false); refreshUnreadCount(session.user.id); }} />}
      {showForm && <ListingFormPanel onClose={() => setShowForm(false)} />} {showAuth && <AuthDialog initialMode={authMode} onClose={() => { setShowAuth(false); setAuthMode('login'); }} />}
    </div>
  );
}

function ExploreRail({ activeType, onSelect, onMap }: { activeType: 'Tümü' | PropertyType; onSelect: (type: 'Tümü' | PropertyType) => void; onMap: () => void }) { return <section className="-mx-5 mb-9 border-b border-black/5 bg-white px-5 pb-5 pt-5 dark:border-white/10 dark:bg-white/5 lg:-mx-10 lg:px-10"><div className="mx-auto max-w-[1440px]"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#ffb21a]">Keşfet</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Yaşamına uygun olanı bul</h2></div><button onClick={onMap} className="flex items-center gap-2 rounded-full border border-[#d4ddd3] px-3 py-2 text-xs font-semibold text-[#526257] transition hover:border-[#f43f68]"><MapPin size={14} /> Haritada gör</button></div><div className="flex snap-x gap-4 overflow-x-auto pb-1 scrollbar-hide">{exploreCategories.map((category) => <button key={category.label} onClick={() => onSelect(category.type)} className={`group min-w-[132px] snap-start text-center ${activeType === category.type ? 'text-[#f43f68]' : 'text-[#68746b]'}`}><div className={`mx-auto h-[104px] w-[132px] overflow-hidden rounded-2xl border-2 bg-[#f2f4ef] shadow-sm transition group-hover:-translate-y-0.5 ${activeType === category.type ? 'border-[#f43f68]' : 'border-transparent'}`}><Image src={category.image} alt={category.label} width={264} height={208} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /></div><span className="mt-2 block whitespace-nowrap text-xs font-semibold">{category.label}</span></button>)}</div></div></section>; }

function ListingCard({ listing, index, compact = false, isLiked, isSaved, favoriteCount = 0, isSellerOnline = false, onLike, onSave, onOpen }: { listing: Listing; index: number; compact?: boolean; isLiked: boolean; isSaved: boolean; favoriteCount?: number; isSellerOnline?: boolean; onLike: () => void; onSave: () => void; onOpen: () => void }) {
  const valueRating = computeValueRating(listing);
  return <article className={`group animate-rise ${compact ? '' : 'rounded-2xl bg-white p-2 shadow-[0_12px_32px_rgba(50,65,53,.08)] dark:bg-white/10'}`} style={{ animationDelay: `${index * 80}ms` }}><div className={compact ? 'pb-3' : 'px-2 pt-2 pb-3'}><SellerStrip listing={listing} isOnline={isSellerOnline} /></div><p className="mt-2 truncate text-xs font-semibold text-[#8f6e44]">{listing.city} / {listing.district} / {listing.neighborhood}</p><div className={`relative overflow-hidden ${compact ? 'rounded-2xl' : 'rounded-xl'}`}><SwipeableGallery images={listing.gallery?.length ? listing.gallery : [listing.image]} alt={listing.title} aspectClass={compact ? 'aspect-[1.25]' : 'aspect-[1.15]'} onOpen={onOpen} priority={index < 3} />{listing.isFeatured && <span className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-[#f5e4bd] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#6f5632]">Vitrin</span>}<span className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full px-3 py-1 text-[10px] font-bold shadow-sm ${listing.sellerType === 'agent' ? 'bg-[#ffb21a] text-[#2b1d00]' : 'bg-[#2f7d5b] text-white'}">{listing.sellerType === 'agent' ? 'Emlakçı' : 'Mülk sahibi'}</span><div className="absolute right-3 top-3 z-20 flex gap-2"><button onClick={onSave} aria-label="Kaydet" className="rounded-full bg-black/25 p-2 text-white backdrop-blur-md transition hover:bg-black/45">{isSaved ? <Bookmark size={16} fill="currentColor" /> : <Bookmark size={16} />}</button><button onClick={onLike} aria-label="Beğen" className="rounded-full bg-black/25 p-2 text-white backdrop-blur-md transition hover:bg-black/45">{isLiked ? <Heart size={16} fill="#f6c6bd" className="text-[#f6c6bd]" /> : <Heart size={16} />}</button></div></div><div className={compact ? 'pt-2' : 'px-2 pt-2'}><ListingValueBadge rating={valueRating} compact={compact} /></div><div className={compact ? 'pt-3' : 'px-2 pt-3'}><ListingCommentsPreview comments={listing.recentComments ?? []} total={listing.comments} onOpen={onOpen} /></div><div className={compact ? 'pt-4' : 'px-2 pb-2 pt-4'}><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs font-semibold text-[#8f6e44]">{listing.type} · {listing.district}</span><span className="flex items-center gap-1 text-[11px] text-[#89938c]"><Eye size={12} /> {listing.views.toLocaleString('tr-TR')} <span className="mx-1 text-[#555]">·</span> <Bookmark size={11} /> {favoriteCount}</span></div><button onClick={onOpen} className="line-clamp-2 text-left text-[17px] font-semibold leading-6 transition hover:text-[#526f59]">{listing.title}</button><div className="mt-3 flex items-center gap-4 text-xs text-[#7b867e]"><span>{listing.area} m²</span><span>{listing.rooms}</span><span>{listing.floor}</span></div><div className="mt-4 flex items-center justify-between"><strong className="text-lg font-bold text-[#334c3a] dark:text-[#dce8dd]">{formatPrice(listing.price)}</strong><div className="flex items-center gap-3 text-xs text-[#879189]"><span className="flex items-center gap-1"><Eye size={14} /> {listing.views.toLocaleString('tr-TR')}</span><span className="flex items-center gap-1"><Heart size={14} /> {listing.likes}</span><span className="flex items-center gap-1"><Bookmark size={13} /> {favoriteCount}</span></div></div><div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs text-[#7e8a81] dark:border-white/10"><button onClick={onLike} className="flex items-center gap-1.5 transition hover:text-[#f43f68]"><Heart size={15} fill={isLiked ? 'currentColor' : 'none'} /> Beğen</button><button onClick={onOpen} className="flex items-center gap-1.5 transition hover:text-[#f43f68]"><MessageCircle size={15} /> {listing.comments}</button><button onClick={() => { if (navigator.share) void navigator.share({ title: listing.title, text: 'EMLAKTAKAZAN ilanı', url: window.location.href }); }} className="flex items-center gap-1.5 transition hover:text-[#f43f68]"><Share2 size={15} /> Paylaş</button></div></div></article>;
}

function Dashboard({ onNew }: { onNew: () => void }) { return <section className="pt-12"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-[#ffb21a]">Ofis paneli</p><h1 className="display text-5xl">Hoş geldin, Derya.</h1><p className="mt-3 text-sm text-[#77827a]">Portföyünü yönet, doğru alıcılarla buluş.</p></div><button onClick={onNew} className="flex items-center gap-2 self-start rounded-full bg-[#f43f68] px-5 py-3 text-xs font-semibold text-white"><Plus size={15} /> Yeni ilan oluştur</button></div><div className="mt-10 grid gap-4 sm:grid-cols-3"><Stat label="Aktif ilan" value="24" note="Geçen aya göre +18%" /><Stat label="Toplam görüntülenme" value="48.2K" note="Son 30 gün" /><Stat label="Takipçi" value="1,284" note="Bu hafta +64" /></div><div className="mt-8 rounded-3xl bg-white p-6 shadow-sm dark:bg-white/10"><div className="mb-5 flex justify-between"><h2 className="text-lg font-semibold">Aktif ilanların</h2><span className="text-xs text-[#849087]">Son güncelleme: bugün</span></div>{listings.slice(0, 3).map((listing) => <div key={listing.id} className="flex items-center gap-4 border-t border-black/5 py-4 dark:border-white/10"><Image src={listing.image} alt={listing.title} width={80} height={64} className="h-16 w-20 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{listing.title}</p><p className="mt-1 text-xs text-[#849087]">{listing.views.toLocaleString('tr-TR')} görüntülenme · {listing.likes} beğeni</p></div><span className="rounded-full bg-[#e8f0e8] px-3 py-1 text-[11px] font-semibold text-[#56725a]">Aktif</span></div>)}</div></section>; }
function Stat({ label, value, note }: { label: string; value: string; note: string }) { return <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-white/10"><p className="text-xs text-[#849087]">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-2 text-xs text-[#6b846f]">{note}</p></div>; }

