'use client';

import { ChangeEvent, useState } from 'react';
import { Loader2, ShieldCheck, Upload, User } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { SellerDetails } from '@/lib/real-estate/types';

export const emptySellerDetails: SellerDetails = {
  sellerType: 'owner',
  propertyNumber: '',
  agentOfficeName: '',
  agentAuthorityNumber: '',
  agentMykNumber: '',
  authorityDocumentPath: '',
};

const inputClass = 'rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/10';
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxDocumentBytes = 5 * 1024 * 1024;
const extensionFor: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function ListingSellerFields({ value, onChange }: { value: SellerDetails; onChange: (next: SellerDetails) => void }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const isAgent = value.sellerType === 'agent';

  const set = (patch: Partial<SellerDetails>) => onChange({ ...value, ...patch });

  async function handleAuthorityDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!allowedImageTypes.includes(file.type) || file.size > maxDocumentBytes) {
      setUploadError('Yalnızca JPEG, PNG veya WEBP formatında, en fazla 5 MB görsel yükleyebilirsiniz.');
      return;
    }
    setUploading(true);
    setUploadError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUploadError('Belge yüklemek için giriş yapmalısınız.');
      setUploading(false);
      return;
    }
    const path = `${user.id}/${crypto.randomUUID()}.${extensionFor[file.type]}`;
    const { error } = await supabase.storage.from('listing-authority-docs').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    setUploading(false);
    if (error) {
      console.error('authority document upload failed', error);
      setUploadError('Belge yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }
    setUploadedName(file.name);
    set({ authorityDocumentPath: path });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-white/5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#9a7a4c]">İlan veren</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button type="button" aria-pressed={!isAgent} onClick={() => set({ sellerType: 'owner' })}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${!isAgent ? 'border-[#2f7d5b] bg-[#e2f0e7] text-[#1f5d43]' : 'border-black/10 text-[#405847] dark:border-white/10 dark:text-[#d7e3d8]'}`}>
            <User size={18} /> Mülk sahibiyim
          </button>
          <button type="button" aria-pressed={isAgent} onClick={() => set({ sellerType: 'agent' })}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${isAgent ? 'border-[#ffb21a] bg-[#fff4d6] text-[#6b4a00]' : 'border-black/10 text-[#405847] dark:border-white/10 dark:text-[#d7e3d8]'}`}>
            <ShieldCheck size={18} /> Emlakçıyım (yetki belgeli)
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <input required value={value.propertyNumber} onChange={(e) => set({ propertyNumber: e.target.value })}
          className={`${inputClass} w-full`} placeholder="Taşınmaz numarası (ada / parsel)" />
        <p className="text-xs leading-5 text-[#849087]">Tapu veya yetki belgesinde yazan taşınmaz numarasını girin. Yönetici bu numarayı belgeyle karşılaştıracaktır.</p>
      </div>

      {isAgent && (
        <div className="space-y-4 border-t border-black/10 pt-4 dark:border-white/10">
          <input value={value.agentOfficeName} onChange={(e) => set({ agentOfficeName: e.target.value })}
            className={`${inputClass} w-full`} placeholder="İşletme unvanı" />
          <div className="grid gap-4 sm:grid-cols-2">
            <input value={value.agentAuthorityNumber} onChange={(e) => set({ agentAuthorityNumber: e.target.value })}
              className={inputClass} placeholder="Yetki belge numarası (EİDS)" />
            <input value={value.agentMykNumber} onChange={(e) => set({ agentMykNumber: e.target.value })}
              className={inputClass} placeholder="MYK belge numarası" />
          </div>

          <div className="rounded-xl border border-dashed border-[#e0c48a] bg-[#fff9ec] p-4">
            <p className="text-sm font-semibold text-[#6b4a00]">Yetki belgesi ekran görüntüsü</p>
            <p className="mt-1 text-xs leading-5 text-[#7d6230]">Taşınmaz Ticareti Yetki Belgesi ekranınızın görüntüsünü yükleyin. Yetki belge numaranızı öğrenmek için Ticaret Bakanlığı sorgulama sayfasını kullanabilirsiniz.</p>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#e0c48a] bg-white py-3 text-sm font-semibold text-[#6b4a00] transition hover:bg-[#fff4d6]">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'Yükleniyor...' : value.authorityDocumentPath ? 'Belgeyi değiştir' : 'Belge görüntüsü seç'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void handleAuthorityDocument(e)} disabled={uploading} />
            </label>
            {value.authorityDocumentPath && !uploadError && (
              <p className="mt-2 text-xs font-semibold text-[#2f7d5b]">Yüklendi{uploadedName ? `: ${uploadedName}` : ''}</p>
            )}
            {uploadError && <p className="mt-2 text-xs text-[#8c5545]">{uploadError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
