'use client';

import { featureFieldsFor, splitMultiValue, type FeatureField } from '@/lib/real-estate/property-features';
import type { PropertyType } from '@/lib/real-estate/property-types';

const selectClass = 'rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none dark:border-white/10 dark:bg-white/10';

export function ListingFeatureFields({ type, values, onChange }: {
  type: PropertyType;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const fields = featureFieldsFor(type);
  const singles = fields.filter((field) => !field.multi);
  const multis = fields.filter((field) => field.multi);

  function toggleMulti(field: FeatureField, option: string) {
    const current = splitMultiValue(values[field.key]);
    const next = current.includes(option) ? current.filter((item) => item !== option) : [...current, option];
    onChange(field.key, next.join(', '));
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#dfe6dc] bg-[#f0f5ef] p-4 dark:bg-white/5">
      <p className="text-xs font-bold uppercase tracking-[.12em] text-[#617663]">{type} özellikleri</p>
      <p className="text-xs text-[#617663]">Bilmediğin alanları boş bırakabilirsin; ilanda &quot;Belirtilmedi&quot; olarak görünür. Bina yaşı zorunludur.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {singles.map((field) => (
          <label key={field.key} className="block text-xs font-semibold text-[#405847] dark:text-[#d7e3d8]">
            {field.label}{field.required && <span className="text-[#f43f68]"> *</span>}
            <select
              required={field.required}
              value={values[field.key] ?? ''}
              onChange={(event) => onChange(field.key, event.target.value)}
              className={`mt-1.5 w-full ${selectClass}`}
            >
              <option value="" disabled={field.required}>{field.required ? 'Seçin' : 'Belirtilmedi'}</option>
              {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        ))}
      </div>

      {multis.map((field) => {
        const selected = splitMultiValue(values[field.key]);
        return (
          <div key={field.key}>
            <p className="mb-2 text-xs font-semibold text-[#405847] dark:text-[#d7e3d8]">{field.label}</p>
            <div className="flex flex-wrap gap-2">
              {field.options.map((option) => {
                const active = selected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleMulti(field, option)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? 'border-[#405847] bg-[#405847] text-white' : 'border-black/10 bg-white text-[#405847] hover:border-[#405847] dark:border-white/10 dark:bg-white/10 dark:text-[#d7e3d8]'}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
