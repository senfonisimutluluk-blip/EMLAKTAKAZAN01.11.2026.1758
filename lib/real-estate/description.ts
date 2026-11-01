import type { PropertyType } from './property-types';

export function generateListingDescription(input: {
  type: PropertyType;
  city: string;
  district: string;
  neighborhood: string;
  area: number;
  rooms: string;
  floor: string;
  details: Record<string, string>;
  features: string[];
}): string {
  const { type, city, district, neighborhood, area, rooms, floor, details, features } = input;
  const location = [city, district].filter(Boolean).join(' / ');
  const kind = type.toLocaleLowerCase('tr-TR');
  const sentences: string[] = [];

  const opening = [
    `${location} bölgesinde${neighborhood ? `, ${neighborhood} mahallesinde` : ''} yer alan ${area} m² ${kind}.`,
    rooms ? `${rooms} oda planıyla kullanım kolaylığı sunuyor.` : '',
    floor ? `${floor}. katta yer almaktadır.` : '',
  ].filter(Boolean).join(' ');
  sentences.push(opening);

  const buildingParts = [
    details['Bina yaşı'] && details['Bina yaşı'] !== 'Bina yok' ? `bina yaşı ${details['Bina yaşı']}` : '',
    details['Konut tipi'] ? `${details['Konut tipi'].toLocaleLowerCase('tr-TR')} tipi` : '',
    details['Kat sayısı'] ? `${details['Kat sayısı']} katlı bina` : '',
    details['Banyo sayısı'] ? `${details['Banyo sayısı']} banyo` : '',
    details['Isıtma'] ? `ısıtma: ${details['Isıtma'].toLocaleLowerCase('tr-TR')}` : '',
    details['Mutfak'] ? `mutfak: ${details['Mutfak'].toLocaleLowerCase('tr-TR')}` : '',
    details['Otopark'] && details['Otopark'] !== 'Yok' ? details['Otopark'].toLocaleLowerCase('tr-TR') : '',
    details['Eşyalı'] === 'Evet' ? 'eşyalı teslim' : '',
    details['Krediye uygun'] === 'Evet' ? 'krediye uygun' : '',
  ].filter(Boolean);
  if (buildingParts.length > 0) sentences.push(`Öne çıkan detaylar: ${buildingParts.join(', ')}.`);

  if (features.length > 0) sentences.push(`Mülkün özellikleri arasında ${features.join(', ').toLocaleLowerCase('tr-TR')} bulunuyor.`);

  const surroundings = ['Muhit', 'Ulaşım', 'Manzara']
    .map((key) => details[key])
    .filter(Boolean)
    .flatMap((value) => value.split(', '));
  if (surroundings.length > 0) sentences.push(`Çevresinde ${surroundings.join(', ').toLocaleLowerCase('tr-TR')} imkanları bulunmaktadır.`);

  sentences.push('Detaylı bilgi, görüş ve randevu için bizimle iletişime geçebilirsiniz.');
  return sentences.join(' ');
}
