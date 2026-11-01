export const konutPropertyTypes = [
  'Daire',
  'Rezidans',
  'Müstakil Ev',
  'Villa',
  'Çiftlik Evi',
  'Köşk & Konak',
  'Yalı',
  'Yalı Dairesi',
  'Yazlık',
  'Kooperatif',
  'Bungalow',
  'Tiny House',
  'Butik Otel',
  'Günlük Kiralık',
] as const;

export const arsaPropertyTypes = ['Arsa', 'İmarsız', 'Tarla', 'Bağ', 'Bahçe'] as const;

export const commercialPropertyTypes = [
  'Ofis',
  'Dükkan',
  'Depo',
  'Fabrika',
  'Otel',
  'Plaza',
  'İş Hanı',
  'AVM',
  'Büro',
  'Showroom',
  'Akaryakıt İstasyonu',
  'Restoran',
  'Atölye',
  'Apartman Dairesi',
  'Çiftlik',
  'Bina',
  'Komple Bina',
  'Devre Mülk',
  'Turistik Tesis',
  'Garaj & Park Yeri',
  'Hamam, Sauna & Spa',
  'İmalathane',
  'İş Hanı Katı & Ofisi',
  'Maden Ocağı',
  'Okul',
  'Otopark',
  'Pazar Yeri',
  'Plaza Katı & Ofisi',
  'Rezidans Katı & Ofisi',
  'Spor Tesisi',
  'Toplantı & Etkinlik Salonu',
] as const;

export const GENERAL_COMMERCIAL_TYPE = 'Ticari Gayrimenkul';

export const propertyTypes = [
  ...konutPropertyTypes,
  ...arsaPropertyTypes,
  ...commercialPropertyTypes,
] as const;

export type PropertyType = (typeof propertyTypes)[number] | typeof GENERAL_COMMERCIAL_TYPE;

export const allPropertyTypeOptions: PropertyType[] = [...propertyTypes, GENERAL_COMMERCIAL_TYPE];
