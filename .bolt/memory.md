# Project memory

## Product intent & audience

- **EMLAKTAKAZAN**: Next.js real estate platform for Turkish-speaking real estate offices and investors.
- User communicates in Turkish; expects responses in Turkish when initiating in Turkish.
- Ana sayfa ilan kartlarında interaktif fotoğraf galerisi (Instagram tarzı kaydırma) önemli UX özellik.
- İlanlara video yükleme özelliği eklendi; her ilan için maksimum 1 video.

## Brand personality & voice

- Helpful, instructional tone; provides step-by-step guidance with clear formatting (bold UI elements, numbered lists).
- Turkish-language UI and responses.

## Visual design & UX direction

- Built on Next.js with TypeScript, Tailwind CSS, and shadcn/ui components.
- Leaflet maps for property location display.
- Modern real estate marketplace patterns (property listings, maps, detail views).
- Listing kartlarında görseller için Instagram-style swipeable gallery:
  - Sağa/sola parmakla çekerek fotoğraf değiştirme (ana sayfada, detaya girmeden)
  - Alt kısımda nokta (dot indicator) ile aktif fotoğraf konumu
  - Birden fazla fotoğraf varsa sağ/sol ok butonları görünür
  - Çift tıklayarak ilan detayına geçiş
  - `SwipeableGallery` bileşeni `home-shell.tsx` içinde `ListingCard`'a entegre edildi
  - `Listing` tipinde `gallery` alanı mevcut
- Video yükleme özelliği:
  - Listing formunda fotoğraf yükleme alanının altında video yükleme bölümü
  - Maksimum 1 video, desteklenen formatlar: MP4, WebM, QuickTime, 100 MB'a kadar
  - Yüklendikten sonra önizleme ve silme butonu
  - Listing detay sayfasında fotoğrafların altında video oynatıcı (play button ile)

## Decisions, constraints & rationale

- Source repository: `https://github.com/postoglufatih3-hub/Son.git` — cloned and dependencies installed.
- Stack: Next.js + TypeScript + Supabase + Leaflet + Tailwind/shadcn.
- Two Supabase Edge Functions deployed: `import-listing` and `property-market-analysis`.
- GitHub integration handled via Bolt UI for backup, commit sync, and branch management.
- SwipeableGallery entegrasyonu sonrası build başarılı (doğrulandı).
- Video yükleme özelliği eklendi; build başarılı doğrulandı.
- `listingFields` ve listing form yapısında video alanı için güncellemeler yapıldı.

## Open questions & assumptions

- Supabase project URL/keys and environment configuration details not yet captured.
- Database schema and table structure for listings/properties not yet documented (video alanı için `videoUrl` benzeri alan gerekebilir).
- No `.bolt/prompt` global instructions exist; context inferred from support interactions and repo contents.
- SwipeableGallery dokunmatik cihazlar dışında (mouse drag) davranışı doğrulanmadı.
- Video storage için Supabase bucket yapılandırması ve depolama politikaları doğrulanmadı.
- Video yükleme sırasında ilerleme göstergesi (progress bar) eklenmedi; büyük dosyalarda UX sorunu olabilir.