# Eksamensklar

Eksamensklar er en personlig leseplanlegger for studenter. Du legger inn eksamener og innleveringer med dato, estimert arbeidsmengde og vanskelighetsgrad, og appen lager automatisk en leseplan fordelt utover dagene frem til fristene.

Det er en ren frontend-app (React + Vite + TypeScript). All data lagres i nettleserens localStorage, og appen har ingen innlogging eller backend.

**Demo:** _lenke kommer_

## Funksjoner

- **Automatisk leseplan** ut fra frister, estimat, vanskelighetsgrad og hvor mange timer du kan lese hver ukedag
- **Repetisjonsdag** dagen før hver skoleeksamen, og buffer før innleveringsfrister
- **Kalender** med ukesoversikt, timer per emne og eksamener/frister markert
- **Fridager:** trykk «Fri» på en dag, så flyttes øktene til andre dager
- **Planlegg på nytt:** glemte økter fordeles utover de gjenværende dagene
- **Fokustidtaker med lesestrategier:** Pomodoro (25/5), 50/10, dypt arbeid eller egendefinert, med tips underveis
- **Temaer:** Klassisk, sju anime-temaer og Marvel, hver med egne farger, skrift og banner
- **Advarsel** når det ikke er nok tid til alt før en frist

## Hvordan AI ble brukt

Appen er laget med vibe coding sammen med Claude (Claude Code). Jeg beskrev hva jeg ville ha på norsk, og AI-en skrev, testet og forbedret koden. Utviklingen skjedde i runder med tilbakemelding:

1. Grunnversjon: leseplan, kalender, emner og innstillinger
2. Fridager og en mer oversiktlig kalender
3. Nytt, roligere design (uten «AI-look»)
4. Lesestrategier med fokustidtaker
5. Temaer inspirert av anime og Marvel

Etter hver endring ble appen testet med automatiske tester (Vitest) og sjekket visuelt i nettleseren på PC- og mobilbredde.

## Kom i gang

```bash
npm install
npm run dev      # utviklingsserver på http://localhost:5173
npm test         # Vitest-tester for planleggeren og tidtakeren
npm run build    # statisk bygg i dist/
npm run preview  # se på bygget lokalt
```

## Publisering

- **GitHub Pages:** Push til `main`. Workflowen i `.github/workflows/deploy.yml` tester, bygger og publiserer. Under *Settings → Pages* i repoet setter du *Source* til **GitHub Actions**.
- **VibeOff / annen statisk hosting:** Kjør `npm run build` og last opp innholdet i `dist/`. Bygget bruker relative stier (`base: './'`), så det fungerer også fra en undermappe.

## Filstruktur

```
src/
├── App.tsx               faner, tilstand og lagring
├── types.ts              datamodell
├── lib/
│   ├── planner.ts        ren planleggingslogikk (ingen React/localStorage)
│   ├── planner.test.ts   enhetstester
│   ├── focus.ts          lesestrategier og tidtakerlogikk
│   ├── focus.test.ts     enhetstester
│   ├── themes.ts         temaer (tekster, skrift, farger i velgeren)
│   ├── dates.ts          datohjelpere (lokale datostrenger)
│   ├── storage.ts        localStorage
│   ├── images.ts         valgfritt eget bannerbilde per tema
│   ├── demoData.ts       eksempeldata og standardinnstillinger
│   ├── colors.ts, labels.ts
└── components/           CourseForm, CoursesPage, TodayView, CalendarView,
                          CountdownList, SettingsForm, SessionItem, Warnings,
                          FocusTimer
```

## Slik fungerer planleggeren

`generatePlan(courses, settings, today, completedSessions)` er en ren funksjon. `today` sendes inn, så testene får faste datoer.

1. **Kapasitet per dag:** Lesetimene for ukedagen (0 på fridager) deles i økter av valgt lengde (standard 90 min) med 15 min pause mellom. En rest på minst 30 min blir en kortere økt. Ingen økter slutter etter kl. 22.
2. **Eksamensdagen:** Ingen økter før eksamen er ferdig, og deretter 30 min pause. Selve emnet får ingen økter på eller etter eksamensdagen.
3. **Dagen før skoleeksamen:** Alle øktene den dagen er repetisjon av det emnet.
4. **Innleveringer:** Får prosjektøkter. Siste økt ligger senest dagen før fristdagen (buffer).
5. **Fordeling:** Hvert emne har en periode fra i dag til sin siste tillatte dag, regnet bakover fra fristen. Timene spres jevnt over perioden. Hver ledig økt går til emnet med høyest hastegrad, `gjenstående timer / dager igjen × (1 + 0,2 × (vanskelighetsgrad − 1))`, blant emnene som ligger bak sitt tempo.
6. **Overlappende frister:** For hver økt sjekkes det om emnene med tidligst frist trenger all gjenværende kapasitet frem til fristen sin. Gjør de det, får de forrang, slik at ingen frist mister timer unødvendig.
7. **Advarsel:** Timer som ikke får plass, vises som «ITPE3100 mangler 4,5 t før eksamen».

`replan()` («Planlegg på nytt») beholder alle fullførte økter og trekker timene deres fra estimatet. Ikke-avkryssede økter fra tidligere dager forkastes, og resten planlegges på nytt fra i dag.

## Demo-tips

1. Gå til **Emner** og trykk **Last inn eksempeldata**.
2. Kryss av en økt under **I dag**.
3. Gå til **Innstillinger → Demodato** og sett datoen noen dager frem. **I dag** viser da glemte økter.
4. Trykk **Planlegg på nytt**. De glemte timene fordeles utover de gjenværende dagene.
5. Sett lesetimene til 1 t per dag for å vise advarselen om for lite tid.
6. Trykk **Start økt** på en økt under **I dag** for å vise fokustidtakeren.
7. Velg et tema under **Innstillinger → Tema**.
