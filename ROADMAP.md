# 🗺️ Plán rozvoje projektu (Product Roadmap)

Tento dokument definuje vizi a jednotlivé vývojové milníky aplikace **Zápisky AI** od současné verze v1 až po pokročilou gamifikaci v5.

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
   - Integrace **Google Gemini 2.5 Flash** pro rozpoznávání rukopisu a tištěného textu z fotek.
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

## 📚 Verze 3: Aktivní studium & Testování (Flashcards & Practice)
Cíl: Umožnit studentům efektivně se učit přímo z jejich zdigitalizovaných zápisků.

1. **Chytré kartičky (Flashcards)**:
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

## ⚡ Verze 4: Gamifikace, Dopaminová smyčka & Žebříčky
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
   - Možnost „flexit“ se:
     - Celkovým časem věnovaným studiu tento týden.
     - Počtem nasbíraných drahokamů.
     - Nejdelší nepřerušenou sérií (Study Streak).

---

## 🎁 Verze 5: Bedny s raritami (CS:GO Chests & Customisation)
Cíl: Herní systém odměn s otevíráním truhel a unikátními předměty pro úpravu profilu.

1. **Mechanika otevírání beden (Chest Unboxing)**:
   - Možnost otevřít truhlu za nasbírané drahokamy ze studia nebo za splnění velkých cílů.
   - Animovaný pás rotujících předmětů se zvukem tikání a napětím jako v CS:GO / herních loot boxech.
2. **Systém rarit (Rarity Tiers)**:
   - ⚪ **Common (Běžné)** — Základní barvy a jednoduché rámečky.
   - 🔵 **Rare (Vzácné)** — Elegantní tematické ikony a odznaky.
   - 🟣 **Epic (Epické)** — Animované rámečky profilu, speciální barvy karet.
   - 🟡 **Legendary (Legendární)** — Zlaté a holografické efekty na profilu, exkluzivní tituly.
   - 🔴 **Mythic (Mytické)** — Extrémně vzácné zářící aury, částicové efekty a unikátní zvukové sady aplikace.
3. **Kustomizace profilu (Profile Customisation)**:
   - Vybavitelné skiny na profil a avatary.
   - Vlastní tituly u jména (např. *Matematický mág*, *Knihomol*, *Noční sova*).
   - Alternativní barevné motivy pro zápisky a 3D karty.
   - Výměna nebo vystavení nejvzácnějších trofejí ve vitríně na profilu.
