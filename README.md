# Routine

Web App per pianificare la routine settimanale e spuntare le attività durante la giornata.
Sito statico (HTML, CSS, JavaScript) pubblicato su Cloudflare Pages. I dati sono salvati nel browser.

## File

| File | A cosa serve |
|---|---|
| `index.html` | Struttura delle schermate |
| `style.css` | Grafica (smartphone, desktop, tema chiaro e scuro) |
| `app.js` | Tutta la logica dell'app |
| `sw.js` | Permette di aprire l'app anche senza connessione |
| `manifest.json`, `icon*.png`, `icon.svg` | Nome e icona per la schermata Home |

## Pubblicazione (solo dal browser)

### 1. GitHub
1. Su github.com clicca **+ → New repository**.
2. Nome: `routine` (o quello che preferisci). Va bene sia **Private** sia Public. Clicca **Create repository**.
3. Nella pagina del repository clicca **uploading an existing file** (oppure **Add file → Upload files**).
4. Trascina **tutti i file** estratti dallo zip, non la cartella. `index.html` deve trovarsi nella radice del repository.
5. Clicca **Commit changes**.

### 2. Cloudflare Pages
1. Su dash.cloudflare.com vai in **Workers & Pages → Create → Pages → Connect to Git**.
2. Seleziona il repository `routine` e clicca **Begin setup**.
3. Configura così:
   - **Framework preset:** None
   - **Build command:** lascia vuoto
   - **Build output directory:** lascia vuoto (oppure `/`)
4. Clicca **Save and Deploy**. In meno di un minuto l'app è online su `routine-xxx.pages.dev`.

Da questo momento ogni modifica salvata su GitHub (anche dall'editor web, con l'icona della matita) viene pubblicata automaticamente.

### 3. Sullo smartphone
Apri l'indirizzo `.pages.dev` e aggiungi l'app alla schermata Home:
- **iPhone (Safari):** pulsante Condividi → **Aggiungi a Home**
- **Android (Chrome):** menu ⋮ → **Installa app** / **Aggiungi a schermata Home**

Dall'icona sulla Home l'app si apre a tutto schermo. Su iPhone è anche il modo per evitare che Safari cancelli i dati dopo un periodo senza utilizzo.

## Come si usa
- **Spuntare un'attività:** tocca la riga.
- **Modificare un'attività:** tocca la matita.
- **Aggiungere un'attività:** usa il pulsante **+**.
- **Cambiare giorno:** tocca la striscia dei giorni. Con le frecce, o scorrendo la striscia, passi alla settimana precedente o successiva.
- **Attività ricorrente:** selezionando più giorni nel pannello, l'attività è una sola. Modifichi l'orario una volta e cambia in tutti quei giorni.
- **Menu ⋯:** copia il giorno su altri giorni, riordina, esporta e importa il backup.
- **Ordine:** le attività con orario sono in ordine cronologico automatico. Il riordino manuale vale per quelle senza orario e per quelle con lo stesso orario.
- **Nuova settimana:** le spunte sono legate alla data, quindi ogni settimana riparte pulita da sola.

## Importante sui dati
I dati restano **solo nel browser in cui li inserisci**: telefono e computer non si sincronizzano tra loro, e cancellando i dati di navigazione si perdono.
Usa **⋯ → Esporta backup** ogni tanto. Con **Importa backup** puoi anche spostare la routine da un dispositivo all'altro.

## Aggiornamenti futuri
Se modifichi i file e l'app sul telefono sembra non aggiornarsi, chiudila e riaprila: il service worker scarica sempre la versione più recente quando sei online.
