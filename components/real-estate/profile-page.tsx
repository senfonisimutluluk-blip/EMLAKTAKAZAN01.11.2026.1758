'use client';

import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { Camera, Check, Heart, LogOut, UserRound, Users, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Listing } from '@/lib/real-estate/types';
import { listings } from '@/lib/real-estate/listings';
import { ProfileListingsSection } from '@/components/real-estate/profile-listings-section';
import { ProfileSavedAnalyses } from '@/components/real-estate/profile-saved-analyses';
import { ProfileFavoriters } from '@/components/real-estate/profile-favoriters';

type Profile = { id: string; display_name: string; office_name: string | null; role: string; avatar_url: string | null; bio: string | null };
type PublicProfile = Pick<Profile, 'id' | 'display_name' | 'office_name' | 'role' | 'bio' | 'avatar_url'>;

export function ProfilePage({ user, favoriteCount, onSignOut, onClose }: { user: User; favoriteCount: number; onSignOut: () => void; onClose: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [discover, setDiscover] = useState<PublicProfile[]>([]);
  const [followers, setFollowers] = useState<PublicProfile[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const profileResult = await supabase.from('profiles').select('id, display_name, office_name, role, avatar_url, bio').eq('id', user.id).maybeSingle();
      let profileData = profileResult.data as Profile | null;
      if (!profileData) {
        const fallback = { id: user.id, display_name: user.email?.split('@')[0] ?? 'EMLAKTAKAZAN kullanıcısı', role: 'visitor' };
        const created = await supabase.from('profiles').upsert(fallback).select('id, display_name, office_name, role, avatar_url, bio').maybeSingle();
        profileData = created.data as Profile | null;
      }
      const favoritesResult = await supabase.from('user_favorites').select('listing_key').eq('user_id', user.id);
      const favoriteKeys = new Set((favoritesResult.data ?? []).map((item: { listing_key: string }) => item.listing_key));
      const followsResult = await supabase.from('follows').select('followed_id').eq('follower_id', user.id);
      const followedIds = (followsResult.data ?? []).map((item: { followed_id: string }) => item.followed_id);
      const followerResult = await supabase.from('follows').select('follower_id').eq('followed_id', user.id);
      const followerIds = (followerResult.data ?? []).map((item: { follower_id: string }) => item.follower_id);
      const followedProfiles = followedIds.length ? await supabase.from('profiles').select('id, display_name, office_name, role, bio, avatar_url').in('id', followedIds) : { data: [] as PublicProfile[] };
      const followerProfiles = followerIds.length ? await supabase.from('profiles').select('id, display_name, office_name, role, bio, avatar_url').in('id', followerIds) : { data: [] as PublicProfile[] };
      const discoverResult = await supabase.from('profiles').select('id, display_name, office_name, role, bio, avatar_url').neq('id', user.id).limit(12);
      if (mounted) {
        setProfile(profileData);
        setName(profileData?.display_name ?? '');
        setBio(profileData?.bio ?? '');
        setAvatarUrl(profileData?.avatar_url ?? null);
        setFavoriteListings(listings.filter((listing) => favoriteKeys.has(listing.id)));
        setFollowing(followedIds);
        setFollowers((followerProfiles.data ?? []) as PublicProfile[]);
        setDiscover([...(followedProfiles.data ?? []), ...(discoverResult.data ?? []).filter((person) => !followedIds.includes(person.id))] as PublicProfile[]);
        setBusy(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, [user.id, user.email]);

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { setMessage('Profil fotoğrafı görsel olmalı ve 5 MB altında olmalı.'); return; }
    setUploadingAvatar(true);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (upload.error) { setMessage('Profil fotoğrafı yüklenemedi.'); setUploadingAvatar(false); return; }
    const publicUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    const profileUpdate = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    setMessage(profileUpdate.error ? 'Profil fotoğrafı kaydedilemedi.' : 'Profil fotoğrafın güncellendi.');
    if (!profileUpdate.error) setAvatarUrl(publicUrl);
    setUploadingAvatar(false);
  }

  async function saveProfile() {
    const { error } = await supabase.from('profiles').update({ display_name: name.trim(), bio: bio.trim(), avatar_url: avatarUrl }).eq('id', user.id);
    setMessage(error ? 'Profil kaydedilemedi.' : 'Profilin güncellendi.');
  }

  async function toggleFollow(profileId: string) {
    const isFollowing = following.includes(profileId);
    const result = isFollowing ? await supabase.from('follows').delete().eq('follower_id', user.id).eq('followed_id', profileId) : await supabase.from('follows').insert({ followed_id: profileId });
    if (result.error) { setMessage('Takip işlemi tamamlanamadı.'); return; }
    setFollowing((current) => isFollowing ? current.filter((id) => id !== profileId) : [...current, profileId]);
  }

  if (busy || !profile) return <section className="py-20 text-center text-sm text-[#aaa9b6]">Profil hazırlanıyor...</section>;
  const followedPeople = discover.filter((person) => following.includes(person.id));
  const suggestedPeople = discover.filter((person) => !following.includes(person.id));
  return <section className="mx-auto max-w-6xl py-10"><div className="mb-8 flex items-start justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-[#ffb21a]">Hesabım</p><h1 className="text-4xl font-bold text-white sm:text-5xl">Profilin</h1><p className="mt-3 text-sm text-[#aaa9b6]">Favorilerini, takip ettiklerini ve seni takip edenleri yönet.</p></div><button onClick={onClose} className="rounded-full border border-white/10 p-3 text-[#aaa9b6]" aria-label="Profili kapat"><X size={18} /></button></div><div className="grid gap-6 lg:grid-cols-[.78fr_1.22fr]"><div className="rounded-3xl border border-white/10 bg-[#171720] p-6"><div className="flex items-center gap-4"><div className="relative"><div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-[#f43f68]/15 text-[#ff9ab0]">{avatarUrl ? <img src={avatarUrl} alt={profile.display_name} className="h-full w-full object-cover" /> : <UserRound size={32} />}</div><label className="absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-4 border-[#171720] bg-[#f43f68] text-white transition hover:bg-[#d82e57]" aria-label="Profil fotoğrafı yükle"><Camera size={15} /><input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void uploadAvatar(event)} /></label></div><div><h2 className="text-xl font-bold text-white">{profile.display_name}</h2><p className="text-xs text-[#aaa9b6]">{profile.role === 'agent' ? 'Emlakçı hesabı' : 'Ziyaretçi hesabı'}</p><p className="mt-1 text-xs text-[#777687]">{uploadingAvatar ? 'Fotoğraf yükleniyor...' : 'Fotoğrafını güncelle'}</p></div></div><label className="mt-7 block text-xs font-semibold text-[#aaa9b6]">Adın<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#20202c] px-4 py-3 text-sm text-white outline-none focus:border-[#f43f68]" /></label><label className="mt-4 block text-xs font-semibold text-[#aaa9b6]">Kısa bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-[#20202c] px-4 py-3 text-sm text-white outline-none focus:border-[#f43f68]" placeholder="Kendinden bahset..." /></label><div className="mt-4 grid grid-cols-3 gap-2"><ProfileStat icon={<Heart size={16} />} value={favoriteCount} label="Favori" /><ProfileStat icon={<Users size={16} />} value={following.length} label="Takip" /><ProfileStat icon={<UserRound size={16} />} value={followers.length} label="Takipçi" /></div><button onClick={() => void saveProfile()} className="mt-5 w-full rounded-xl bg-[#f43f68] py-3 text-sm font-semibold text-white">Profili kaydet</button>{message && <p className="mt-3 text-xs leading-5 text-[#ffb5c5]">{message}</p>}<button onClick={onSignOut} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-semibold text-[#aaa9b6] hover:text-white"><LogOut size={16} /> Çıkış yap</button></div><div className="space-y-6"><ProfileListingsSection userId={user.id} /><ProfileFavoriters userId={user.id} /><ProfileSavedAnalyses userId={user.id} /><ProfileGroup title="Favorilerin" subtitle="Kaydettiğin ilanlar" icon={<Heart className="text-[#f43f68]" size={22} />}>{favoriteListings.length === 0 ? <EmptyText text="Henüz favori ilan eklemedin. İlan kartlarındaki kaydet simgesini kullanabilirsin." /> : <div className="grid gap-3 sm:grid-cols-2">{favoriteListings.map((listing) => <div key={listing.id} className="flex items-center gap-3 rounded-2xl bg-[#20202c] p-3"><img src={listing.image} alt={listing.title} className="h-14 w-16 rounded-xl object-cover" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{listing.title}</p><p className="mt-1 text-xs text-[#ff9ab0]">{new Intl.NumberFormat('tr-TR').format(listing.price)} TL</p></div></div>)}</div>}</ProfileGroup><ProfileGroup title="Takip ettiklerin" subtitle="Emlak profesyonelleri" icon={<Users className="text-[#f43f68]" size={22} />}>{followedPeople.length === 0 ? <EmptyText text="Henüz kimseyi takip etmiyorsun. Önerilen profillerden başlayabilirsin." /> : <div className="space-y-3">{followedPeople.map((person) => <PersonRow key={person.id} person={person} following onToggle={() => void toggleFollow(person.id)} />)}</div>}</ProfileGroup><ProfileGroup title="Takipçilerin" subtitle="Seni takip eden kişiler" icon={<UserRound className="text-[#ffb21a]" size={22} />}>{followers.length === 0 ? <EmptyText text="Henüz takipçin bulunmuyor." /> : <div className="space-y-3">{followers.map((person) => <PersonRow key={person.id} person={person} following={following.includes(person.id)} onToggle={() => void toggleFollow(person.id)} />)}</div>}</ProfileGroup><ProfileGroup title="Keşfet" subtitle="Takip edilecek kişiler" icon={<Users className="text-[#ffb21a]" size={22} />}>{suggestedPeople.length === 0 ? <EmptyText text="Şimdilik yeni profil önerisi yok." /> : <div className="space-y-3">{suggestedPeople.map((person) => <PersonRow key={person.id} person={person} following={false} onToggle={() => void toggleFollow(person.id)} />)}</div>}</ProfileGroup></div></div></section>;
}

function ProfileStat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) { return <div className="rounded-2xl bg-[#20202c] p-3"><span className="text-[#ffb21a]">{icon}</span><strong className="mt-2 block text-xl text-white">{value}</strong><span className="text-[11px] text-[#aaa9b6]">{label}</span></div>; }
function ProfileGroup({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: ReactNode; children: ReactNode }) { return <div className="rounded-3xl border border-white/10 bg-[#171720] p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#ffb21a]">{subtitle}</p><h2 className="mt-1 text-2xl font-bold text-white">{title}</h2></div>{icon}</div>{children}</div>; }
function EmptyText({ text }: { text: string }) { return <p className="rounded-2xl bg-[#20202c] p-4 text-sm text-[#aaa9b6]">{text}</p>; }
function PersonRow({ person, following, onToggle }: { person: PublicProfile; following: boolean; onToggle: () => void }) { return <div className="flex items-center gap-3 rounded-2xl bg-[#20202c] p-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f43f68]/15 font-bold text-[#ff9ab0]">{person.avatar_url ? <img src={person.avatar_url} alt={person.display_name} className="h-full w-full object-cover" /> : person.display_name.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{person.display_name} {person.role === 'agent' && <Check size={13} className="inline text-[#ffb21a]" />}</p><p className="truncate text-xs text-[#aaa9b6]">{person.office_name || (person.role === 'agent' ? 'Emlak profesyoneli' : 'EMLAKTAKAZAN üyesi')}</p></div><button onClick={onToggle} className={`rounded-xl px-3 py-2 text-xs font-semibold ${following ? 'border border-white/10 text-[#aaa9b6]' : 'bg-[#f43f68] text-white'}`}>{following ? 'Takipte' : 'Takip et'}</button></div>; }
