import type { PropertyType } from './property-types';
import { arsaPropertyTypes, konutPropertyTypes } from './property-types';

export const NOT_SPECIFIED = 'Belirtilmedi';

export type FeatureField = {
  key: string;
  label: string;
  options: string[];
  multi?: boolean;
  required?: boolean;
};

type FeatureGroup = 'konut' | 'arsa' | 'ticari';

const buildingAge = ['Bina yok', '0 (Yeni)', '1', '2', '3', '4', '5', '6-10 arası', '11-15 arası', '16-20 arası', '21 ve üzeri'];
const yesNo = ['Evet', 'Hayır'];
const commonUse = ['Boş', 'Kiracı var', 'Mülk sahibi oturuyor'];
const titleDeed = ['Kat mülkiyetli', 'Kat irtifaklı', 'Hisseli tapu', 'Arsa tapulu', 'Tarla tapulu', 'Kooperatif hisseli'];
const seller = ['Sahibinden', 'Emlak ofisinden', 'İnşaat firmasından'];
const heating = ['Klima', 'Kombi (doğalgaz)', 'Merkezi sistem', 'Yerden ısıtma', 'Soba', 'Şömine', 'Isı pompası', 'Yok'];
const neighborhood = ['Alışveriş merkezi', 'Cami', 'Denize sıfır', 'Eczane', 'Eğlence merkezi', 'İlkokul-Ortaokul', 'Lise', 'Market', 'Park', 'Plaj', 'Sağlık ocağı', 'Semt pazarı', 'Şehir merkezi'];
const transport = ['Anayol', 'Cadde', 'Dolmuş', 'Minibüs', 'Otobüs durağı', 'Sahil', 'Metro', 'Tramvay', 'Metrobüs'];
const view = ['Deniz', 'Doğa', 'Havuz', 'Park & yeşil alan', 'Şehir', 'Boğaz'];

const residentialFields: FeatureField[] = [
  { key: 'Bina yaşı', label: 'Bina yaşı', options: buildingAge.slice(1), required: true },
  { key: 'Konut tipi', label: 'Konut tipi', options: ['Daire', 'Dubleks', 'Tripleks', 'Penthouse', 'Müstakil', 'Stüdyo', 'Loft'] },
  { key: 'Kat sayısı', label: 'Binadaki kat sayısı', options: ['1', '2', '3', '4', '5', '6-10', '11-20', '21 ve üzeri'] },
  { key: 'Isıtma', label: 'Isıtma', options: heating },
  { key: 'Banyo sayısı', label: 'Banyo sayısı', options: ['1', '2', '3', '4', '5+'] },
  { key: 'Mutfak', label: 'Mutfak', options: ['Kapalı (ayrı)', 'Açık (Amerikan)', 'Yok'] },
  { key: 'Otopark', label: 'Otopark', options: ['Yok', 'Açık otopark', 'Kapalı otopark', 'Açık+kapalı otopark'] },
  { key: 'Eşyalı', label: 'Eşyalı', options: yesNo },
  { key: 'Kullanım durumu', label: 'Kullanım durumu', options: commonUse },
  { key: 'Site içerisinde', label: 'Site içerisinde', options: yesNo },
  { key: 'Krediye uygun', label: 'Krediye uygun', options: yesNo },
  { key: 'Tapu durumu', label: 'Tapu durumu', options: titleDeed },
  { key: 'Kimden', label: 'Kimden', options: seller },
  { key: 'Engelli ve yaşlıya uygun', label: 'Engelli ve yaşlıya uygun', options: yesNo },
  { key: 'Cephe', label: 'Cephe', options: ['Kuzey', 'Güney', 'Doğu', 'Batı'], multi: true },
  { key: 'İç özellikler', label: 'İç özellikler', multi: true, options: ['ADSL', 'Ahşap doğrama', 'Amerikan kapı', 'Ankastre fırın', 'Boyalı', 'Çelik kapı', 'Duşakabin', 'Ebeveyn banyosu', 'Fırın', 'Gömme dolap', 'Görüntülü diyafon', 'Kiler', 'Panjur/Jaluzi', 'Set üstü ocak', 'Spot aydınlatma', 'Şömine', 'Teras', 'Vestiyer'] },
  { key: 'Dış özellikler', label: 'Dış özellikler', multi: true, options: ['Isı yalıtımı', 'Uydu', 'Yüzme havuzu (açık)', 'Yüzme havuzu (kapalı)', 'Bahçe', 'Kapıcı', 'Güvenlik', 'Jeneratör'] },
  { key: 'Muhit', label: 'Muhit', multi: true, options: neighborhood },
  { key: 'Ulaşım', label: 'Ulaşım', multi: true, options: transport },
  { key: 'Manzara', label: 'Manzara', multi: true, options: view },
];

const landFields: FeatureField[] = [
  { key: 'Bina yaşı', label: 'Üzerindeki bina yaşı', options: buildingAge, required: true },
  { key: 'İmar durumu', label: 'İmar durumu', options: ['Konut imarlı', 'Ticari imarlı', 'Konut+ticari imarlı', 'Sanayi imarlı', 'Tarım arazisi', 'İmar yok'] },
  { key: 'KAKS', label: 'KAKS (emsal)', options: ['0.20', '0.30', '0.40', '0.50', '1.00', '1.50', '2.00', '2.50+'] },
  { key: 'Gabari', label: 'Gabari (kat limiti)', options: ['1 kat', '2 kat', '3 kat', '4 kat', '5 kat', '6+ kat', 'Serbest'] },
  { key: 'Tapu durumu', label: 'Tapu durumu', options: titleDeed },
  { key: 'Kimden', label: 'Kimden', options: seller },
  { key: 'Yola cephe', label: 'Yola cephe', options: yesNo },
  { key: 'Muhit', label: 'Muhit', multi: true, options: neighborhood },
  { key: 'Ulaşım', label: 'Ulaşım', multi: true, options: transport },
  { key: 'Manzara', label: 'Manzara', multi: true, options: view },
];

const commercialFields: FeatureField[] = [
  { key: 'Bina yaşı', label: 'Bina yaşı', options: buildingAge.slice(1), required: true },
  { key: 'Kat sayısı', label: 'Binadaki kat sayısı', options: ['1', '2', '3', '4', '5', '6-10', '11-20', '21 ve üzeri'] },
  { key: 'Isıtma', label: 'Isıtma', options: heating },
  { key: 'Otopark', label: 'Otopark', options: ['Yok', 'Açık otopark', 'Kapalı otopark', 'Açık+kapalı otopark'] },
  { key: 'Asansör', label: 'Asansör', options: yesNo },
  { key: 'Kullanım durumu', label: 'Kullanım durumu', options: commonUse },
  { key: 'Tapu durumu', label: 'Tapu durumu', options: titleDeed },
  { key: 'Kimden', label: 'Kimden', options: seller },
  { key: 'Muhit', label: 'Muhit', multi: true, options: neighborhood },
  { key: 'Ulaşım', label: 'Ulaşım', multi: true, options: transport },
];

const groupFields: Record<FeatureGroup, FeatureField[]> = {
  konut: residentialFields,
  arsa: landFields,
  ticari: commercialFields,
};

export function featureGroupFor(type: PropertyType): FeatureGroup {
  if ((arsaPropertyTypes as readonly string[]).includes(type)) return 'arsa';
  if ((konutPropertyTypes as readonly string[]).includes(type)) return 'konut';
  return 'ticari';
}

export function featureFieldsFor(type: PropertyType): FeatureField[] {
  return groupFields[featureGroupFor(type)];
}

export function splitMultiValue(value: string | undefined): string[] {
  return value ? value.split(', ').filter(Boolean) : [];
}

export function specifiedFeatureDetails(type: PropertyType, values: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of featureFieldsFor(type)) {
    const value = values[field.key];
    if (value && value !== NOT_SPECIFIED) result[field.key] = value;
  }
  return result;
}

export function selectedFeatureTags(type: PropertyType, values: Record<string, string>): string[] {
  return featureFieldsFor(type).filter((field) => field.multi).flatMap((field) => splitMultiValue(values[field.key]));
}
