# TotoSWrap importer

Pipeline locale per ricostruire i dati storici di TotoSWrap a partire
dall'esportazione della chat WhatsApp.

## Procedura

1. Copiare l'esportazione WhatsApp in:

   input/_chat.txt

2. Controllare e aggiornare, quando necessario:

   - input/wrap-times.json
   - input/winners.json
   - input/manual-fixes.json
   - input/day-selections.json
   - input/crazy-days.json

3. Eseguire:

   npm run start

   Genera:

   - output/days.json
   - output/players.json

4. Eseguire:

   npm run results

   Genera:

   - output/calculated-results.json
   - output/validation-report.json
   - output/manual-fixes-needed.json

   Se la validazione segnala errori o correzioni necessarie,
   sistemare gli input e rieseguire i passaggi necessari.

5. Eseguire:

   npm run migration

   Genera:

   - output/migration-data.json
   - output/migration-validation.json

6. Eseguire:

   npm run state:build-final

   Genera:

   - output/final-state.json
   - output/final-state-validation.json

## Firestore

La pipeline termina con la generazione locale di final-state.json.

Non esiste un comando npm per importare automaticamente questo file
in Firestore. Eventuali operazioni sul database di produzione devono
essere eseguite separatamente e con controlli espliciti.

Il file firestore/firebase.js rimane disponibile come connessione
Firebase per operazioni controllate.

## Utility

npm run edoardo

Estrae i messaggi di Edoardo da input/_chat.txt e genera:

- output/edoardo-messages.txt
