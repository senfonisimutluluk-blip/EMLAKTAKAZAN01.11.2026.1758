'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { AiMarketAnalysis } from '@/components/real-estate/ai-market-analysis';
import { EstateAgentChat } from '@/components/real-estate/estate-agent-chat';
import { ParcelLookup } from '@/components/real-estate/parcel-lookup';
import type { Listing } from '@/lib/real-estate/types';

type AiTab = 'agent' | 'analysis' | 'parcel';

const tabs: Array<{ key: AiTab; label: string }> = [
  { key: 'agent', label: 'Emlak Ajanı' },
  { key: 'analysis', label: 'Piyasa analizi' },
  { key: 'parcel', label: 'Ada / Parsel' },
];

export function AiHub({ onOpenListing }: { onOpenListing: (listing: Listing) => void }) {
  const [tab, setTab] = useState<AiTab>('agent');

  return (
    <section className="mx-auto max-w-5xl py-10">
      <div className="mb-8">
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f43f68]/15 text-[#f43f68]"><Sparkles size={24} /></span>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-[#ffb21a]">Yapay zeka</p>
        <h1 className="text-4xl font-bold text-white sm:text-5xl">Emlak Ajanı ve analiz</h1>
        <p className="mt-3 text-sm text-[#aaa9b6]">Aradığınızı yazarak ya da sesli söyleyerek bulun, gayrimenkulün piyasa değerini inceleyin veya ada/parsel sorgulayın.</p>
      </div>
      <div role="tablist" className="mb-6 inline-flex rounded-full border border-white/10 bg-[#171720] p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={`rounded-full px-5 py-2.5 text-xs font-semibold transition ${tab === item.key ? 'bg-[#f43f68] text-white' : 'text-[#aaa9b6] hover:text-white'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'agent' ? <EstateAgentChat onOpenListing={onOpenListing} /> : tab === 'analysis' ? <AiMarketAnalysis /> : <ParcelLookup />}
    </section>
  );
}
