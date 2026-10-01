# Lightbox pentru poze si meniu hamburger pe mobil - design

Data: 2026-10-01
Status: aprobat de utilizator in brainstorming (abordarea A pentru ambele)

## 1. Scop

Doua imbunatatiri de UI, independente intre ele:

1. **Poze din amintiri:** la clic/tap pe o miniatura se deschide o vedere mare (lightbox) cu zoom si pan. Salvarea prin apasare lunga (telefon) sau clic dreapta (calculator) functioneaza deja nativ, pentru ca pozele sunt `<img>` normale; ramane neschimbata si in lightbox.
2. **Header pe mobil:** linkurile se suprapun pe ecrane inguste. Sub 640px devin un meniu hamburger; peste 640px headerul ramane neschimbat.

### Nu face parte din lucrare
- navigare intre poze in lightbox (urmatoarea/anterioara) - aleasa explicit: nu
- biblioteci noi de zoom sau de meniu
- bara de navigare fixa jos (varianta C respinsa)
- schimbari de rute, de date sau de securitate (fara migrari, fara rute noi)

## 2. Lightbox

### Componente si fisiere
| Fisier | Responsabilitate |
|---|---|
| `lib/zoom/pinch-zoom.ts` | functii pure: `clampScale`, `distanceBetween`, `midpoint`, `nextDoubleTapScale`, `clampPan`, `zoomAround` |
| `lib/zoom/pinch-zoom.test.ts` | teste unitare pentru functiile de mai sus |
| `components/PhotoLightbox.tsx` | componenta client: `<dialog>` modal, Pointer Events, transform CSS |
| `app/(app)/invitatii/[id]/PhotoGrid.tsx` | devine componenta client; tine `openPhotoId`; miniaturile devin butoane care deschid lightbox-ul |
| `app/globals.css` | stiluri pentru dialog, buton de inchidere, miniaturi apasabile |
| `e2e/flow.spec.ts` | test: clic pe miniatura deschide dialogul, Escape il inchide |

### Comportament
- Imaginea din lightbox foloseste acelasi `/api/photos/<id>` (cookie de sesiune trimis automat, aceleasi headere, nicio ruta noua).
- `<dialog>` deschis cu `showModal()` (ref + effect): focus blocat in dialog, Escape inchide nativ, `::backdrop` intunecat.
- Inchidere: buton X (minim 44x44px, prima tinta de focus), clic pe fundal, Escape.
- Zoom intre 1x si 4x.
- Gesturi (Pointer Events, fara dependente):
  - doua degete: pinch, ancorat pe punctul dintre degete
  - un deget cat timp scala > 1: pan
  - dublu-tap / dublu-clic: comuta intre 1x si 2.5x, ancorat pe punctul atins
  - rotita mouse: zoom, ancorat pe cursor
  - `touch-action: none` pe zona imaginii, ca browserul sa nu intercepteze gesturile
- Panul este limitat (`clampPan`) ca imaginea sa nu iasa complet din ecran.
- Tranzitia CSS este activa doar la dublu-tap/dublu-clic si dezactivata in timpul tragerii sau pinch-ului.
- `prefers-reduced-motion`: fara tranzitie.
- Salvare: imaginea din lightbox ramane `<img>` simplu, fara `draggable=false`, fara blocarea meniului contextual.

### Acoperire de securitate
Nicio schimbare in rute, headere sau acces. Rutele `/api/photos/[id]` raman protejate de sesiune si CSP strict (`default-src 'none'; sandbox`); `<img src>` din aceeasi origine continua sa mearga sub CSP-ul paginii (`img-src 'self'`).

## 3. Meniu hamburger

### Componente si fisiere
| Fisier | Responsabilitate |
|---|---|
| `components/AppHeader.tsx` | devine componenta client; stare `menuOpen`; buton hamburger; panou cu linkuri |
| `app/globals.css` | stiluri pentru butonul hamburger, panoul vertical, separatorul pentru „Iesi” |
| `e2e/flow.spec.ts` | test pe viewport de telefon: butonul deschide meniul, apasarea unui link il inchide |

### Comportament
- Prag: `max-width: 640px` (acelasi ca in restul CSS).
- Peste 640px: rand orizontal exact ca acum.
- Sub 640px: rand de linkuri ascuns; buton cu trei liniute langa logo, cu `aria-expanded`, `aria-controls`, eticheta „Meniu”.
- Panou sub header, fundal glass, linkuri verticale pe toata latimea, minim 44px inaltime; badge-ul de notificari ramane vizibil; „Iesi” ultimul, separat printr-o linie subtire.
- Se inchide la: apasarea unui link, Escape, clic in afara panoului, schimbarea rutei (`usePathname`).
- `aria-current="page"` setat pe linkul curent (acum e doar stilizat, nu setat).
- Fara biblioteca noua; tranzitie scurta de opacitate/inaltime, dezactivata la `prefers-reduced-motion`.
- Logout ramane formular cu Server Action (neschimbat).

## 4. Testare
- Unitar (Vitest): toate functiile pure din `lib/zoom/pinch-zoom.ts`.
- E2E (Playwright, `reducedMotion: 'reduce'` ca in suita existenta):
  - lightbox: deschidere la clic, `Escape` inchide, butonul X inchide
  - meniu mobil (viewport 375x812): butonul deschide, link apasat navigheaza si inchide meniul
- `npm run verify` si `npm run build` trebuie sa treaca.
- Verificare manuala (nu automatizabila aici): pinch real pe telefon, apasare lunga pentru salvare in lightbox.
