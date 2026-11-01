'use client';

import { FormEvent, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { importListingFromUrl, type ImportedListingDraft } from '@/lib/real-estate/listing-import';
import { parseListingText } from '@/lib/real-estate/listing-text-parser';

const hasAnyField = (draft: ImportedListingDraft) => Object.values(draft).some((value) => value !== null);

export function ListingImportSection({ onImport }: { onImport: (draft: ImportedListingDraft) => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pastedText, setPastedText] = useState('');

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      onImport(await importListingFromUrl(url.trim()));
    } catch (cause) {
      console.error('listing import failed', cause);
      setError('Sahibinden bağlantısı sunucudan okunamadı. Aşağıya ilan sayfasının yazısını yapıştırarak devam edebilirsiniz.');
    } finally {
      setBusy(false);
    }
  }

  function handlePasted() {
    const draft = parseListingText(pastedText);
    if (!hasAnyField(draft)) {
      setError('Yapıştırılan metinde ilan bilgisi bulunamadı. Sayfanın tüm yazısını kopyalayıp tekrar deneyin.');
      return;
    }
    setError('');
    onImport(draft);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-dashed border-[#aebbad] bg-[#eef3ed] p-4 dark:bg-white/5">
      <form onSubmit={handleImport}>
        <p className="text-sm font-semibold text-[#405847] dark:text-[#d7e3d8]">Sahibinden.com ilanından çek</p>
        <p className="mb-3 mt-1 text-xs leading-5 text-[#526257] dark:text-[#aaa9b6]">
          Kendi ilanınızın bağlantısını yapıştırın. Bilgiler formu doldurur, kontrol edip düzenleyebilirsiniz.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required
            className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/10"
            placeholder="https://www.sahibinden.com/ilan/..." />
          <button type="submit" disabled={busy || !url.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#405847] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#33493a] disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {busy ? 'Çekiliyor...' : 'İlanı çek'}
          </button>
        </div>
      </form>

      <div>
        <p className="text-sm font-semibold text-[#405847] dark:text-[#d7e3d8]">Ya da ilan sayfasının yazısını yapıştırın</p>
        <p className="mb-3 mt-1 text-xs leading-5 text-[#526257] dark:text-[#aaa9b6]">
          İlan sayfasında Ctrl+A ile tümünü seçip Ctrl+C ile kopyalayın, buraya yapıştırın.
        </p>
        <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} rows={5}
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-white/10"
          placeholder="İlan sayfasının yazısını buraya yapıştırın" />
        <button type="button" onClick={handlePasted} disabled={!pastedText.trim()}
          className="mt-2 w-full rounded-xl border border-[#405847] bg-white py-3 text-sm font-semibold text-[#405847] transition hover:bg-[#405847] hover:text-white disabled:opacity-50 dark:bg-white/10 dark:text-[#d7e3d8]">
          Yapıştırılan bilgileri forma aktar
        </button>
      </div>

      {error && <p className="rounded-xl bg-[#f4e4dd] px-4 py-3 text-xs leading-5 text-[#8c5545]">{error}</p>}
    </div>
  );
}
