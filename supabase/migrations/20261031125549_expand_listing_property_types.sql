/*
# Expand allowed listing property types

1. Summary
- The listings table only accepted five property types (Daire, Villa, Ofis, Arsa, Dükkan).
- The app now offers the full list of property types, taken from the sahibinden.com category screens, plus İmarsız, Tarla, Bağ and Bahçe.

2. Modified table
- `listings`: the `property_type` check constraint is replaced with one that allows every type in the app's shared property type list.

3. Security
- No change to row level security, policies or grants.

4. Important notes
- Existing rows only use the original five values, so they all remain valid.
- Only the allowed list grows; no data is changed or removed.
- The app's shared property type list and this constraint must be kept in sync when new types are added.
*/

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_property_type_check;

ALTER TABLE listings ADD CONSTRAINT listings_property_type_check CHECK (
  property_type = ANY (ARRAY[
    'Daire', 'Rezidans', 'Müstakil Ev', 'Villa', 'Çiftlik Evi', 'Köşk & Konak', 'Yalı', 'Yalı Dairesi', 'Yazlık', 'Kooperatif', 'Bungalow', 'Tiny House', 'Butik Otel', 'Günlük Kiralık',
    'Arsa', 'İmarsız', 'Tarla', 'Bağ', 'Bahçe',
    'Ofis', 'Dükkan', 'Depo', 'Fabrika', 'Otel', 'Plaza', 'İş Hanı', 'AVM', 'Büro', 'Showroom', 'Akaryakıt İstasyonu', 'Restoran', 'Atölye',
    'Apartman Dairesi', 'Çiftlik', 'Bina', 'Komple Bina', 'Devre Mülk', 'Turistik Tesis', 'Garaj & Park Yeri', 'Hamam, Sauna & Spa', 'İmalathane',
    'İş Hanı Katı & Ofisi', 'Maden Ocağı', 'Okul', 'Otopark', 'Pazar Yeri', 'Plaza Katı & Ofisi', 'Rezidans Katı & Ofisi', 'Spor Tesisi', 'Toplantı & Etkinlik Salonu',
    'Ticari Gayrimenkul'
  ]::text[])
);
