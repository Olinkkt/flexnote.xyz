# 🗺️ Flexnote (flexnote.oliverseidl.dev) — Plán rozvoje projektu

Tento dokument definuje vizi a jednotlivé vývojové milníky aplikace **Flexnote (flexnote.oliverseidl.dev)** od současné verze v1 až po pokročilou gamifikaci v5.

---

## 🟢 Verze 1: Produkční MVP (Hotovo ✅)
- **Duolingo 3D design systém**: hmatatelná tlačítka (`border-b-4`), čistá typografie Nunito, zaoblené karty.
- **100% vektorové ikony**: nahrazení všech emotikonů knihovnou `lucide-react` a SVG.
- **KaTeX matematické vzorce**: vykreslování rovnic ($D = b^2 - 4ac$, $x_{1,2} = \dots$) v jednotných bílých 3D kartách se zarovnáním.
- **Zjednodušený import z mobilu**: jednokrokové vyfocení sešitu telefonem (`capture="environment"`).
- **Podmíněná detekce předmětu**: automatické přiřazení nebo rychlý dotaz na uživatele při nejasném kontextu.
- **Modální okno zápisku**: záložky „Přehled“ a „Zdrojový kód“ s omezením tlačítka kopírování na kód.
- **Neviditelné scrollbary & localStorage persistence**.

---

## 🚀 Verze 2: Reálná AI, Cloud & Uživatelské účty
Cíl: Přeměnit aplikaci na plně funkční cloudovou platformu se živým zpracováním fotografií sešitů.

1. **Napojení na reálnou Vision API (OCR)**:
   - Integrace multimodálního modelu **GPT-5 Mini** (s nízkou latencí a reasoning effort: low) pro rozpoznávání rukopisu a tištěného textu z fotek.
   - Automatická extrakce matematických vzorců přímo do LaTeX / KaTeX syntaxe.
   - Inteligentní sumarizace a rozčlenění do čistého Markdownu se záchytnými body.
   - Automatická detekce školního předmětu z obsahu zápisku s fallbackem na uživatele.
2. **Cloudová infrastruktura & Databáze**:
   - Backend napojený na cloud (např. Supabase / PostgreSQL).
   - Bezpečné ukládání pořízených fotografií a vygenerovaných `.md` souborů v cloudovém úložišti.
   - Synchronizace zápisků mezi mobilem, tabletem a počítačem v reálném čase.
3. **Autentizace (Sign-up / Sign-in)**:
   - Registrace a přihlašování přes email a heslo nebo sociální sítě (Google, Apple).
   - Ochrana osobních dat a bezpečné šifrování relací.
4. **Uživatelské profily (Profiles)**:
   - Uživatelské jméno, avatar, navštěvovaná škola/ročník.
   - Přehled vlastních předmětů a celková statistika počtu zápisků.

---

## 📶 Verze 2.5: 100% Offline-First & PWA pro studenty (Hotovo ✅)
Cíl: Zaručit, že každý student má okamžitý a plný přístup ke všem svým zápiskům, vzorcům a materiálům i bez připojení k internetu přímo ve třídě, v metru nebo v režimu letadlo.

1. **Service Worker & PWA instalace**:
   - Plné cachování aplikace (`public/sw.js`) — HTML, skripty, styly, KaTeX fonty i Google Fonts.
   - Možnost instalace na plochu telefonu (iOS „Přidat na plochu“, Android „Instalovat aplikaci“) bez nutnosti otevírat prohlížeč.
2. **Offline-First architektura zápisků**:
   - Všechny zápisky bezpečně uložené v lokální mezipaměti zařízení.
   - Rychlé čtení, vyhledávání, filtrace i KaTeX matematické vzorce plně funkční bez internetu.
   - Možnost vstoupit do aplikace offline jako host bez nutnosti okamžitého přihlašování.
3. **Offline fronta změn (Sync Queue)**:
   - Lokální zaznamenávání vytvořených, upravených nebo smazaných zápisků v offline režimu.
   - Automatická synchronizace do cloudu Supabase ihned po obnovení internetového připojení.
4. **Diskrétní offline status & indikátory**:
   - Plochá, čistá notifikační lišta (žádné oválné pilulky) informující o offline režimu a počtu čekajících změn.
   - Přehled stavu offline úložiště a návod na instalaci v záložce Profil.

---

## 📚 Verze 3: Aktivní studium & Testování (Flashcards & Practice)
Cíl: Umožnit studentům efektivně se učit přímo z jejich zdigitalizovaných zápisků.

1. **Chytré kartičky (Flashcards) (Hotovo ✅)**:
   - Automatické generování flashcards jedním kliknutím z libovolného `.md` zápisku pomocí AI.
   - Oboustranné kartičky s 3D flip efektem ve stylu Duolingo.
   - Podpora matematických vzorců a zvýrazněných pojmů na kartičkách.
2. **Cvičné testy a kvízy (Practice Tests)**:
   - Rychlé zkoušení na míru podle obsahu sešitu:
     - Výběr z možností (Multiple-choice A/B/C/D).
     - Doplňování chybějících slov nebo vzorců.
     - Spojování pojmů.
3. **Spaced Repetition System (SRS)**:
   - Algoritmus opakování v optimálních intervalech podle křivky zapomínání (Ebbinghausova křivka).
   - Aplikace sama studentovi připomene pojmy, které mu dělají potíže.

---

## ⚡ Verze 4: Gamifikace, Dopaminová smyčka & Žebříčky (Hotovo ✅)
Cíl: Udělat z učení návykovou aktivitu plnou dopaminu, kde spolu studenti mohou soutěžit a předhánět se.

1. **Dopaminový výukový systém (Fun & Effective)**:
   - Zvukové a vizuální odměny při správných odpovědích (zvuky komba, konfety, haptická odezva na mobilu).
   - Záchrana série (Streak) při každodenním učení.
2. **Čas strávený učením (Study Time Tracker)**:
   - Přesný stopovací mechanismus aktivního studia (čtení zápisků, opakování kartiček, řešení kvízů).
3. **Drahokamy & Ekonomika aplikace**:
   - Získávání drahokamů (Diamonds) výhradně za poctivé studium, úspěšné testy a udržení série.
4. **Soutěžení a flexení (Leaderboards & Friend Leagues)**:
   - Týdenní a celkové žebříčky mezi spolužáky a přáteli.
   - Možnost „flexit“:
     - Celkovým časem věnovaným studiu tento týden.
     - Počtem nasbíraných drahokamů.
     - Nejdelší nepřerušenou sérií (Study Streak).

---

## 🏫 Verze 5: Třídy, Sdílení zápisků & Školní komunity (Classroom & Shared Notes)
Cíl: Propojit spolužáky z téže školy a třídy, umožnit sdílení zdigitalizovaných sešitů a výběr školy z oficiální databáze MŠMT.

1. **Databáze škol MŠMT v profilu**:
   - Napojení na oficiální databázi českých škol (`schools.csv` z MŠMT) s inteligentním našeptávačem při úpravě profilu a dovedností.
   - Vyhledávání a auto-complete výběr školy (např. *Gymnázium Jana Nerudy*, *SPŠ sdělovací techniky*, *Bratrská škola*).
2. **Konkrétní třídy (např. 2.A, 2.GB, C1.A)**:
   - Možnost vytvořit nebo se připojit ke konkrétní třídě na dané škole.
   - Vstup do třídy pomocí unikátního sdíleného kódu (Class Join Code), e-mailové pozvánky nebo schválení.
3. **Sdílené zápisky ve třídě (Classroom Shared Notes)**:
   - Společný třídní feed zdigitalizovaných zápisků z jednotlivých předmětů.
   - Uživatelé v jedné třídě mohou sdílet zdigitalizované zápisky ze sešitu se spolužáky, ukládat si je a společně se učit.

## 🛡️ Produkční hardening, stabilita & infrastruktura (Production Hardening)
Cíl: Zabezpečit aplikaci před nečekanými náklady, pády v mobilních prohlížečích, chybami sítě a zajistit bleskový běh i při stovkách studentů a zápisků.

### 🔴 Kritická priorita: Ochrana rozpočtu a stabilita (Hotovo ✅)
1. **Omezení velikosti nahrávání & klientská komprese (`limit upload size`) (Hotovo ✅)**:
   - Implementován `imageCompressor.ts` s pevnou validací (max 15 MB).
   - Nativní `<canvas>` komprese do formátu JPEG (kvalita 0.82, max 1920 px, zmenšení z ~15 MB na <1.5 MB) před odesláním do AI a Supabase Storage.
   - 100% ochrana paměti v mobilním prohlížeči Safari/Chrome před pádovým přetížením.
2. **Časové limity API volání (`handle API timeouts`) (Hotovo ✅)**:
   - Implementován 35s `AbortController` timeout v `openrouter.ts`, `flashcards.ts` i `quiz.ts`.
   - Elegantní zobrazení chybové hlášky při přetížení modelu namísto nekonečného načítání a zamrznutí UI.
3. **Pevné stropy výdajů & API limity (`set spending caps` & `set API limits`) (Hotovo ✅)**:
   - Klientské denní kvóty v `rateLimiter.ts` (max 35 OCR skenů/den, max 30 kvízů/den, max 40 kartiček/den).
   - Doporučení pevného hard-cap stropu v dashboardu OpenRouter (např. $10 bez auto-reloadu) a zapnutého Supabase Spend Cap.
4. **Rate limiting & Anti-spam cooldown (`add rate limiting`) (Hotovo ✅)**:
   - Centrální služba `rateLimiter.ts` s 4–5s cooldownem proti rychlému vícenásobnému klikání na AI generátory.
   - Ochrana e-mailového exportu zápisků (max 5 odeslání za hodinu, 15s cooldown).

### 🟡 Vysoká & Střední priorita: Výkon, databáze a UX odolnost (Hotovo ✅)
5. **Ošetření neúspěšných požadavků & Retry (`handle failed requests`) (Hotovo ✅)**:
   - Implementován stav selhání v `ScanModal.tsx` s možností **„Zkusit digitalizaci znovu“** bez ztráty snímku.
   - Možnost **„Uložit fotku bez AI (doplnit ručně)“**, aby student nepřišel o zápisek při výpadku AI.
   - Automatický retry s 1.5s prodlevou v `openrouter.ts` pro přechodné síťové výpadky.
6. **Databázové indexy v Supabase Postgres (`add DB indexes`) (Hotovo ✅)**:
   - Aplikována migrace `20260919_performance_indexes.sql` přímo do produkční databáze.
   - Složené indexy: `idx_notes_user_created ON notes(user_id, created_at DESC)`, `idx_notes_subject`, `idx_profiles_study_time`, `idx_profiles_weekly_study`, `idx_profiles_diamonds`, `idx_profiles_weekly_diamonds`, `idx_profiles_streak`, `idx_profiles_school`, `idx_custom_schools_status_name`.
7. **Optimalizace dotazů & stránkování (`optimise DB queries` & `paginate Lg results`) (Hotovo ✅)**:
   - `fetchNotesFromCloud` rozšířeno o stránkování (`range(offset, offset + limit - 1)`).
   - Klientské dávkování po 12 zápiscích v `RecentNotesList.tsx` s tlačítkem **„Načíst další zápisky ({zbývá})“** pro rychlé vykreslení i stovek sešitů.
8. **Globální ošetření chyb v UI (`add error handling`) (Hotovo ✅)**:
   - Vytvořena komponenta `ErrorBoundary.tsx` s Duolingo 3D designem a záchytem chyb v Reactu.
   - Obalena celá aplikace v `main.tsx`.
   - KaTeX renderer s bezpečným fallbackem bez shození aplikace.
9. **Stavy načítání a prázdného obsahu (`add loading states` & `add empty states`) (Hotovo ✅)**:
   - Duolingo skeleton loadery (pulzující karty) pro seznam zápisků při načítání.
   - Pulzující skeletony v `LeaderboardView.tsx` pro řádky žebříčku.
   - Přátelský prázdný stav při filtru školy: *„Zatím jsi tu ze své školy jediný! 🏫 Pozvi spolužáky tlačítkem Flexit.“*

### ⚪ Neplatí v současné fázi (Odloženo na zavedení placených funkcí)
- **Zabránění duplicitním předplatným (`prevent dupe subs`)**:
  - *Neplatí nyní:* Flexnote je v současnosti 100% bezplatná aplikace pro studenty bez platebního modulu (Stripe). Bod začne platit až při zavedení případného placeného plánu (Flexnote Pro).
- **Zabránění duplicitním platbám (`prevent dupe payments`)**:
  - *Neplatí nyní:* V aplikaci neprobíhají žádné reálné finanční transakce ani platby kartou (pouze virtuální drahokamy za studium).

---

## 🔮 Nápady do budoucna (Later / Backlog)

- **Bedny s raritami (CS:GO Chests & Customisation)**:
  - Herní systém odměn s otevíráním truhel a unikátními předměty pro úpravu profilu (odloženo na později pro zachování čistého zaměření na studium a komunitu).


