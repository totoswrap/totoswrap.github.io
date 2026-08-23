import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ======================================================
// FILE
// ======================================================

const DAYS_FILE = path.join(
    __dirname,
    "../output/days.json"
);

const WRAP_TIMES_FILE = path.join(
    __dirname,
    "../input/wrap-times.json"
);

const WINNERS_FILE = path.join(
    __dirname,
    "../input/winners.json"
);

const MANUAL_FIXES_FILE = path.join(
    __dirname,
    "../input/manual-fixes.json"
);

const DAY_SELECTIONS_FILE = path.join(
    __dirname,
    "../input/day-selections.json"
);

const CRAZY_DAYS_FILE = path.join(
    __dirname,
    "../input/crazy-days.json"
);

const OUTPUT_FILE = path.join(
    __dirname,
    "../output/calculated-results.json"
);

const VALIDATION_FILE = path.join(
    __dirname,
    "../output/validation-report.json"
);

const FIXES_NEEDED_FILE = path.join(
    __dirname,
    "../output/manual-fixes-needed.json"
);


// ======================================================
// LETTURA JSON
// ======================================================

function readJson(file, fallback = {}) {

    if (!fs.existsSync(file))
        return fallback;

    return JSON.parse(
        fs.readFileSync(file, "utf8")
    );

}


function ensureJsonFile(file, initialValue = {}) {

    if (fs.existsSync(file))
        return;

    fs.writeFileSync(
        file,
        JSON.stringify(
            initialValue,
            null,
            2
        ) + "\n",
        "utf8"
    );

    console.log(
        `ℹ️ Creato ${path.basename(file)}`
    );

}


ensureJsonFile(
    MANUAL_FIXES_FILE,
    {}
);

ensureJsonFile(
    DAY_SELECTIONS_FILE,
    {}
);

ensureJsonFile(
    CRAZY_DAYS_FILE,
    {}
);


const days =
    readJson(DAYS_FILE, []);

const wrapTimes =
    readJson(WRAP_TIMES_FILE, {});

const manualWinners =
    readJson(WINNERS_FILE, {});

const manualFixes =
    readJson(MANUAL_FIXES_FILE, {});

const daySelections =
    readJson(DAY_SELECTIONS_FILE, {});

const crazyDays =
    readJson(CRAZY_DAYS_FILE, {});


// ======================================================
// COSTANTI
// ======================================================

const DAY_SEC = 86400;
const DAY_START_SEC = 5 * 3600;


// ======================================================
// VALIDAZIONE
// ======================================================

const validation = {

    errors: [],
    warnings: [],
    info: []

};


function addError(
    id,
    type,
    message,
    extra = {}
) {

    validation.errors.push({
        id,
        type,
        message,
        ...extra
    });

}


function addWarning(
    id,
    type,
    message,
    extra = {}
) {

    validation.warnings.push({
        id,
        type,
        message,
        ...extra
    });

}


function addInfo(
    id,
    type,
    message,
    extra = {}
) {

    validation.info.push({
        id,
        type,
        message,
        ...extra
    });

}


// ======================================================
// TEMPI
// ======================================================

function toSeconds(time) {

    if (
        !time ||
        typeof time !== "string"
    ) {
        return null;
    }

    const parts =
        time.split(":").map(Number);

    if (
        parts.length !== 2 &&
        parts.length !== 3
    ) {
        return null;
    }

    const hour = parts[0];
    const minute = parts[1];
    const second = parts[2] || 0;

    if (
        !Number.isFinite(hour) ||
        !Number.isFinite(minute) ||
        !Number.isFinite(second) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59 ||
        second < 0 ||
        second > 59
    ) {
        return null;
    }

    let total =
        hour * 3600 +
        minute * 60 +
        second;

    if (total < DAY_START_SEC)
        total += DAY_SEC;

    return total;

}


// ======================================================
// MODALITÀ DI CALCOLO
// ======================================================

function calculationMode(gameDate) {

    if (gameDate <= "2026-06-29")
        return "legacy";

    return "current";

}


// ======================================================
// CONFINI TRA LE SCOMMESSE
// ======================================================

function betBlockBoundarySec(
    prevSec,
    nextSec,
    mode
) {

    if (mode === "legacy") {

        return Math.floor(
            (prevSec + nextSec) / 2
        ) + 1;

    }

    return Math.floor(
        (prevSec + 60 + nextSec) / 2
    );

}


// ======================================================
// RANGE / TERRITORI
// ======================================================

function boundaries(
    guesses,
    gameDate
) {

    const mode =
        calculationMode(gameDate);

    const valid =
        Object.entries(guesses || {})
            .map(([name, time]) => ({
                name,
                time,
                sec: toSeconds(time)
            }))
            .filter(
                guess =>
                    guess.sec !== null
            )
            .sort((a, b) => {

                if (a.sec !== b.sec)
                    return a.sec - b.sec;

                return a.name.localeCompare(
                    b.name
                );

            });


    if (!valid.length)
        return [];


    const groups = [];

    for (const guess of valid) {

        const existing =
            groups.find(
                group =>
                    group.sec === guess.sec
            );

        if (existing) {

            existing.names.push(
                guess.name
            );

        } else {

            groups.push({
                names: [guess.name],
                sec: guess.sec
            });

        }

    }


    const slices = [];

    for (
        let i = 0;
        i < groups.length;
        i++
    ) {

        let startSec;
        let endSec;


        if (i === 0) {

            startSec =
                groups[i].sec - 1800;

        } else {

            startSec =
                betBlockBoundarySec(
                    groups[i - 1].sec,
                    groups[i].sec,
                    mode
                );

        }


        if (
            i === groups.length - 1
        ) {

            endSec =
                groups[i].sec +
                59 +
                1800;

        } else {

            const nextBoundary =
                betBlockBoundarySec(
                    groups[i].sec,
                    groups[i + 1].sec,
                    mode
                );

            endSec =
                nextBoundary - 1;

        }


        slices.push({

            names:
                groups[i].names,

            betSec:
                groups[i].sec,

            exactStart:
                groups[i].sec,

            exactEnd:
                groups[i].sec + 59,

            start:
                startSec,

            end:
                endSec

        });

    }

    return slices;

}


// ======================================================
// RISULTATO AUTOMATICO
// ======================================================

function calculateResult(
    day,
    wrapTime
) {

    const wrapSec =
        toSeconds(wrapTime);


    if (wrapSec === null) {

        return {

            winner: null,
            winners: [],

            exactWinner: false,

            points: 0,

            noWinner: false,

            reason:
                "invalid-wrap-time"

        };

    }


    const slices =
        boundaries(
            day.import?.guesses || {},
            day.gameDate
        );


    if (!slices.length) {

        return {

            winner: null,
            winners: [],

            exactWinner: false,

            points: 0,

            noWinner: true,

            reason:
                "no-valid-guesses"

        };

    }


    const winningSlice =
        slices.find(
            slice =>
                wrapSec >= slice.start &&
                wrapSec <= slice.end
        );


    if (!winningSlice) {

        return {

            winner: null,
            winners: [],

            exactWinner: false,

            points: 0,

            noWinner: true,

            reason:
                "outside-all-ranges"

        };

    }


    const exactWinner =
        wrapSec >=
            winningSlice.exactStart &&
        wrapSec <=
            winningSlice.exactEnd;


    const winners =
        [...winningSlice.names];


    return {

        winner:
            winners[0] || null,

        winners,

        exactWinner,

        points:
            exactWinner ? 2 : 1,

        noWinner: false,

        reason: null

    };

}


// ======================================================
// WINNER UFFICIALE
// ======================================================

function parseManualWinner(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }


    if (Array.isArray(value)) {

        const names =
            value
                .map(
                    name =>
                        String(name).trim()
                )
                .filter(Boolean);

        if (!names.length)
            return null;

        return {

            winner:
                names[0],

            winners:
                names,

            exactWinner:
                false,

            noWinner:
                false,

            noGame:
                false,

            crazyWinner:
                false

        };

    }


    if (typeof value !== "string")
        return null;


    const text =
        value.trim();

    if (!text)
        return null;


    const lower =
        text.toLowerCase();


    // ----------------------------------------------
    // NO GAME
    // ----------------------------------------------

    if (lower === "no-game") {

        return {

            winner: null,
            winners: [],

            exactWinner:
                false,

            noWinner:
                false,

            noGame:
                true,

            crazyWinner:
                false

        };

    }


    // ----------------------------------------------
    // NO WINNER
    // ----------------------------------------------

    if (lower === "no-winner") {

        return {

            winner: null,
            winners: [],

            exactWinner:
                false,

            noWinner:
                true,

            noGame:
                false,

            crazyWinner:
                false

        };

    }


    // ----------------------------------------------
    // CRAZY + EXACT
    //
    // Nome-crazy-exact
    // ----------------------------------------------

    if (
        lower.endsWith("-crazy-exact")
    ) {

        const name =
            text.slice(
                0,
                -"-crazy-exact".length
            ).trim();

        return {

            winner:
                name,

            winners:
                [name],

            exactWinner:
                true,

            noWinner:
                false,

            noGame:
                false,

            crazyWinner:
                true

        };

    }


    // ----------------------------------------------
    // EXACT
    // ----------------------------------------------

    if (
        lower.endsWith("-exact")
    ) {

        const name =
            text.slice(
                0,
                -"-exact".length
            ).trim();

        return {

            winner:
                name,

            winners:
                [name],

            exactWinner:
                true,

            noWinner:
                false,

            noGame:
                false,

            crazyWinner:
                false

        };

    }


    // ----------------------------------------------
    // CRAZY DAY
    // ----------------------------------------------

    if (
        lower.endsWith("-crazy")
    ) {

        const name =
            text.slice(
                0,
                -"-crazy".length
            ).trim();

        return {

            winner:
                name,

            winners:
                [name],

            exactWinner:
                false,

            noWinner:
                false,

            noGame:
                false,

            crazyWinner:
                true

        };

    }


    // ----------------------------------------------
    // VITTORIA NORMALE
    // ----------------------------------------------

    return {

        winner:
            text,

        winners:
            [text],

        exactWinner:
            false,

        noWinner:
            false,

        noGame:
            false,

        crazyWinner:
            false

    };

}


// ======================================================
// PUNTI VINCITORE
// ======================================================

function winnerPoints(result) {

    if (
        !result ||
        result.noWinner ||
        result.noGame
    ) {
        return 0;
    }


    if (result.crazyWinner) {

        return result.exactWinner
            ? 4
            : 2;

    }


    return result.exactWinner
        ? 2
        : 1;

}


// ======================================================
// MANUAL FIXES
// ======================================================

function getManualFix(id) {

    const fix =
        manualFixes[id];

    if (
        !fix ||
        typeof fix !== "object" ||
        Array.isArray(fix)
    ) {
        return {};
    }

    return fix;

}


function getFixedGuesses(id) {

    const fix =
        getManualFix(id);

    if (
        !fix.guesses ||
        typeof fix.guesses !== "object" ||
        Array.isArray(fix.guesses)
    ) {
        return null;
    }

    return fix.guesses;

}


function getFixedWrapTime(id) {

    const fix =
        getManualFix(id);

    if (
        typeof fix.wrapTime !== "string"
    ) {
        return null;
    }

    return fix.wrapTime;

}


// ======================================================
// CRAZY DAYS
// ======================================================

function getCrazyDay(id) {

    const crazy =
        crazyDays[id];

    if (
        !crazy ||
        typeof crazy !== "object" ||
        Array.isArray(crazy)
    ) {
        return null;
    }

    return crazy;

}


function normalizeCrazyPenalties(crazy) {

    const penalties =
        crazy?.penalties;

    if (
        !penalties ||
        typeof penalties !== "object" ||
        Array.isArray(penalties)
    ) {

        return {

            didNotVote: [],
            farthestFromWrap: []

        };

    }


    const didNotVote =
        Array.isArray(
            penalties.didNotVote
        )
            ? penalties.didNotVote
                .map(
                    name =>
                        String(name).trim()
                )
                .filter(Boolean)
            : [];


    const farthestFromWrap =
        Array.isArray(
            penalties.farthestFromWrap
        )
            ? penalties.farthestFromWrap
                .map(
                    name =>
                        String(name).trim()
                )
                .filter(Boolean)
            : [];


    return {

        didNotVote,
        farthestFromWrap

    };

}


function crazyPointChanges(
    official,
    crazy
) {

    if (
        !official ||
        !official.crazyWinner
    ) {
        return [];
    }


    const penalties =
        normalizeCrazyPenalties(
            crazy
        );


    const changes = [];


    /*
     * Vincitore.
     */
    for (
        const winner
        of official.winners
    ) {

        changes.push({

            player:
                winner,

            points:
                winnerPoints(
                    official
                ),

            reason:
                official.exactWinner
                    ? "crazy-exact-win"
                    : "crazy-win"

        });

    }


    /*
     * Non ha votato.
     */
    for (
        const player
        of penalties.didNotVote
    ) {

        changes.push({

            player,

            points:
                -1,

            reason:
                "did-not-vote"

        });

    }


    /*
     * Pronostico più lontano dal wrap.
     */
    for (
        const player
        of penalties.farthestFromWrap
    ) {

        changes.push({

            player,

            points:
                -1,

            reason:
                "farthest-from-wrap"

        });

    }


    return changes;

}


// ======================================================
// DUPLICATI
// ======================================================

function guessCount(day) {

    return Object.keys(
        day.import?.guesses || {}
    ).length;

}


function messageTime(day) {

    const value =
        Date.parse(
            day.import?.messageDate || ""
        );

    return Number.isFinite(value)
        ? value
        : 0;

}


function suggestBestDayVersion(
    versions
) {

    if (!versions.length)
        return null;

    return versions.reduce(
        (best, candidate) => {

            const bestCount =
                guessCount(best);

            const candidateCount =
                guessCount(candidate);


            if (
                candidateCount >
                bestCount
            ) {
                return candidate;
            }


            if (
                candidateCount <
                bestCount
            ) {
                return best;
            }


            return (
                messageTime(candidate) >
                messageTime(best)
            )
                ? candidate
                : best;

        }
    );

}


// ======================================================
// RAGGRUPPAMENTO DAYS
// ======================================================

const versionsById =
    new Map();


for (const day of days) {

    if (!versionsById.has(day.id)) {

        versionsById.set(
            day.id,
            []
        );

    }

    versionsById
        .get(day.id)
        .push(day);

}


// ======================================================
// RISOLUZIONE DUPLICATI
// ======================================================

const resolvedDays =
    new Map();

const duplicateIds =
    new Set();

const unresolvedDuplicateIds =
    new Set();


console.log("");
console.log("==========");
console.log("DUPLICATI");
console.log("==========");


for (
    const [id, versions]
    of versionsById
) {

    if (versions.length === 1) {

        resolvedDays.set(
            id,
            versions[0]
        );

        continue;

    }


    duplicateIds.add(id);


    const selectedMessageDate =
        daySelections[id] ?? null;


    const suggestion =
        suggestBestDayVersion(
            versions
        );


    let chosen = null;


    if (selectedMessageDate) {

        chosen =
            versions.find(
                version =>
                    version.import
                        ?.messageDate ===
                    selectedMessageDate
            ) || null;

    }


    console.log(`\n${id}`);


    for (const version of versions) {

        let label = "";


        if (
            chosen &&
            version === chosen
        ) {

            label =
                " ← SCELTA MANUALE";

        } else if (
            !chosen &&
            version === suggestion
        ) {

            label =
                " ← SUGGERITA";

        }


        console.log(
            `  ${guessCount(version)} pronostici` +
            ` | ${
                version.import
                    ?.messageDate ||
                "no date"
            }` +
            label
        );

    }


    if (!selectedMessageDate) {

        unresolvedDuplicateIds.add(id);

        addError(

            id,

            "duplicate-selection-required",

            `Trovate ${versions.length} versioni della giornata ma day-selections.json non contiene una scelta`,

            {

                versions:
                    versions.map(
                        version => ({
                            messageDate:
                                version.import
                                    ?.messageDate ||
                                null,

                            guesses:
                                guessCount(
                                    version
                                )
                        })
                    ),

                suggestedMessageDate:
                    suggestion
                        ?.import
                        ?.messageDate ||
                    null

            }

        );

        continue;

    }


    if (!chosen) {

        unresolvedDuplicateIds.add(id);

        addError(

            id,

            "invalid-day-selection",

            `day-selections.json richiede ${selectedMessageDate}, ma questa versione non esiste in days.json`,

            {

                selectedMessageDate,

                availableVersions:
                    versions.map(
                        version =>
                            version.import
                                ?.messageDate ||
                            null
                    )

            }

        );

        continue;

    }


    resolvedDays.set(
        id,
        chosen
    );


    addInfo(

        id,

        "duplicate-day",

        `${versions.length} versioni trovate; usata la versione scelta in day-selections.json`,

        {

            selectedMessageDate,

            guesses:
                guessCount(chosen)

        }

    );

}


// ======================================================
// SELEZIONI OBSOLETE / SUPERFLUE
// ======================================================

for (
    const [
        id,
        selectedMessageDate
    ]
    of Object.entries(daySelections)
) {

    const versions =
        versionsById.get(id);


    if (!versions) {

        addWarning(

            id,

            "stale-day-selection",

            "Presente in day-selections.json ma la giornata non esiste più in days.json",

            {
                selectedMessageDate
            }

        );

        continue;

    }


    if (versions.length === 1) {

        addWarning(

            id,

            "unnecessary-day-selection",

            "Presente in day-selections.json ma days.json contiene una sola versione della giornata",

            {
                selectedMessageDate
            }

        );

    }

}


// ======================================================
// HELPERS DATASET
// ======================================================

function buildSyntheticDay(
    id,
    guesses
) {

    const match =
        id.match(
            /^(\d{4}-\d{2}-\d{2})-(.+)$/
        );

    const gameDate =
        match
            ? match[1]
            : id.slice(0, 10);

    const unit =
        match
            ? match[2]
            : "main";


    return {

        id,

        gameDate,

        unit,

        metadata: {
            createdBy:
                "manual-fix"
        },

        import: {

            messageDate:
                null,

            confidence:
                "MANUAL",

            guesses:
                guesses || {}

        }

    };

}


function effectiveDayForId(id) {

    const fixedGuesses =
        getFixedGuesses(id);


    if (fixedGuesses) {

        const existing =
            resolvedDays.get(id);


        if (existing) {

            return {

                ...existing,

                import: {

                    ...(existing.import || {}),

                    guesses:
                        fixedGuesses,

                    manualFix:
                        true

                }

            };

        }


        return buildSyntheticDay(
            id,
            fixedGuesses
        );

    }


    return (
        resolvedDays.get(id) ||
        null
    );

}


function effectiveWrapTime(id) {

    const fixed =
        getFixedWrapTime(id);

    if (fixed)
        return fixed;

    return wrapTimes[id] ?? null;

}


// ======================================================
// DATASET UFFICIALE
// ======================================================

const officialEntries =
    Object.entries(
        manualWinners
    );


const officialGameIds = [];

let noGameCount = 0;
let crazyGameCount = 0;


for (
    const [
        id,
        winnerValue
    ]
    of officialEntries
) {

    const parsed =
        parseManualWinner(
            winnerValue
        );


    if (
        parsed &&
        parsed.noGame
    ) {

        noGameCount++;


        addInfo(

            id,

            "no-game",

            "Giornata esclusa perché winners.json contiene no-game"

        );


        if (wrapTimes[id]) {

            addInfo(

                id,

                "ignored-wrap",

                "wrap-times.json contiene un wrap per una giornata marcata no-game: verrà ignorato"

            );

        }


        continue;

    }


    if (
        parsed &&
        parsed.crazyWinner
    ) {

        crazyGameCount++;

    }


    officialGameIds.push(id);

}


// ======================================================
// GIORNATE NON UFFICIALI
// ======================================================

const officialIdSet =
    new Set(
        Object.keys(manualWinners)
    );


for (const id of versionsById.keys()) {

    if (!officialIdSet.has(id)) {

        addInfo(

            id,

            "unofficial-day",

            "Presente in days.json ma assente da winners.json: ignorato"

        );

    }

}


// ======================================================
// VALIDAZIONE CRAZY-DAYS.JSON
// ======================================================

/*
 * 1. Ogni -crazy in winners.json DEVE avere
 *    una voce in crazy-days.json.
 *
 * 2. Ogni voce in crazy-days.json DEVE essere
 *    una giornata marcata -crazy in winners.json.
 */

for (
    const [
        id,
        winnerValue
    ]
    of officialEntries
) {

    const parsed =
        parseManualWinner(
            winnerValue
        );


    if (
        !parsed ||
        !parsed.crazyWinner
    ) {
        continue;
    }


    if (!getCrazyDay(id)) {

        addError(

            id,

            "missing-crazy-day-data",

            "La giornata è marcata crazy in winners.json ma manca in crazy-days.json"

        );

    }

}


for (
    const id
    of Object.keys(crazyDays)
) {

    const winnerValue =
        manualWinners[id];

    const parsed =
        parseManualWinner(
            winnerValue
        );


    if (
        !parsed ||
        !parsed.crazyWinner
    ) {

        addError(

            id,

            "orphan-crazy-day",

            "Presente in crazy-days.json ma winners.json non identifica questa giornata come Crazy Day"

        );

    }

}


// ======================================================
// CALCOLO DATASET
// ======================================================

const results = [];

const fixesNeeded = {};

let readyCount = 0;
let brokenGameCount = 0;


for (const id of officialGameIds) {

    const officialWinnerValue =
        manualWinners[id];

    const official =
        parseManualWinner(
            officialWinnerValue
        );


    if (
        unresolvedDuplicateIds.has(id) &&
        !getFixedGuesses(id)
    ) {

        brokenGameCount++;

        fixesNeeded[id] = {

            type:
                "duplicate-selection-required",

            message:
                "Seleziona la versione corretta in day-selections.json",

            versions:
                (
                    versionsById.get(id) ||
                    []
                ).map(
                    version => ({
                        messageDate:
                            version.import
                                ?.messageDate ||
                            null,

                        guesses:
                            guessCount(
                                version
                            )
                    })
                )

        };

        continue;

    }


    const day =
        effectiveDayForId(id);


    // ----------------------------------------------
    // PRONOSTICI MANCANTI
    // ----------------------------------------------

    if (!day) {

        brokenGameCount++;

        addError(

            id,

            "missing-guesses",

            "Giornata ufficiale non trovata in days.json e senza pronostici in manual-fixes.json"

        );


        fixesNeeded[id] = {

            type:
                "missing-guesses",

            winner:
                officialWinnerValue,

            expected: {

                guesses: {
                    "Nome giocatore":
                        "HH:MM"
                }

            }

        };

        continue;

    }


    const guesses =
        day.import?.guesses || {};


    if (
        Object.keys(guesses).length === 0
    ) {

        brokenGameCount++;

        addError(

            id,

            "missing-guesses",

            "La giornata esiste ma non contiene pronostici validi"

        );


        fixesNeeded[id] = {

            type:
                "missing-guesses",

            winner:
                officialWinnerValue,

            expected: {

                guesses: {
                    "Nome giocatore":
                        "HH:MM"
                }

            }

        };

        continue;

    }


    // ----------------------------------------------
    // WRAP
    // ----------------------------------------------

    const wrapTime =
        effectiveWrapTime(id);


    if (!wrapTime) {

        brokenGameCount++;

        addError(

            id,

            "missing-wrap-time",

            "Giornata ufficiale senza wrap time"

        );


        fixesNeeded[id] = {

            type:
                "missing-wrap-time",

            winner:
                officialWinnerValue,

            expected: {
                wrapTime:
                    "HH:MM"
            }

        };

        continue;

    }


    if (
        toSeconds(wrapTime) === null
    ) {

        brokenGameCount++;

        addError(

            id,

            "invalid-wrap-time",

            `Wrap time non valido: ${wrapTime}`

        );


        fixesNeeded[id] = {

            type:
                "invalid-wrap-time",

            currentValue:
                wrapTime,

            expected: {
                wrapTime:
                    "HH:MM"
            }

        };

        continue;

    }


    // ----------------------------------------------
    // CRAZY DAY
    // ----------------------------------------------

    let crazyDay = null;


    if (
        official &&
        official.crazyWinner
    ) {

        const crazy =
            getCrazyDay(id);


        if (!crazy) {

            /*
             * L'errore è già stato registrato
             * nella validazione globale.
             */
            brokenGameCount++;

            fixesNeeded[id] = {

                type:
                    "missing-crazy-day-data",

                expected: {

                    penalties: {

                        didNotVote: [],

                        farthestFromWrap: []

                    }

                }

            };

            continue;

        }


        const penalties =
            normalizeCrazyPenalties(
                crazy
            );


        // ------------------------------------------
        // DID NOT VOTE
        // ------------------------------------------

        for (
            const player
            of penalties.didNotVote
        ) {

            if (
                Object.prototype.hasOwnProperty.call(
                    guesses,
                    player
                )
            ) {

                addError(

                    id,

                    "crazy-did-not-vote-mismatch",

                    `${player} è indicato come didNotVote ma compare nei pronostici`,

                    {
                        player,
                        guess:
                            guesses[player]
                    }

                );

            }

        }


        // ------------------------------------------
        // FARTHEST FROM WRAP
        // ------------------------------------------

        for (
            const player
            of penalties.farthestFromWrap
        ) {

            if (
                !Object.prototype.hasOwnProperty.call(
                    guesses,
                    player
                )
            ) {

                addError(

                    id,

                    "crazy-farthest-missing-guess",

                    `${player} è indicato come farthestFromWrap ma non compare nei pronostici`,

                    {
                        player
                    }

                );

            }

        }


        // ------------------------------------------
        // PENALITÀ DUPLICATA
        // ------------------------------------------

        const duplicatePenaltyPlayers =
            penalties.didNotVote.filter(
                player =>
                    penalties
                        .farthestFromWrap
                        .includes(player)
            );


        for (
            const player
            of duplicatePenaltyPlayers
        ) {

            addError(

                id,

                "crazy-conflicting-penalties",

                `${player} compare sia in didNotVote sia in farthestFromWrap`

            );

        }


        // ------------------------------------------
        // VINCITORE PENALIZZATO
        // ------------------------------------------

        for (
            const winner
            of official.winners
        ) {

            if (
                penalties.didNotVote
                    .includes(winner) ||
                penalties.farthestFromWrap
                    .includes(winner)
            ) {

                addError(

                    id,

                    "crazy-winner-penalized",

                    `${winner} è il vincitore del Crazy Day ma compare anche tra le penalità`

                );

            }

        }


        crazyDay = {

            winnerPoints:
                winnerPoints(
                    official
                ),

            penalties,

            pointChanges:
                crazyPointChanges(
                    official,
                    crazy
                )

        };

    }


    // ----------------------------------------------
    // CALCOLO AUTOMATICO
    // ----------------------------------------------

    const calculated =
        calculateResult(
            day,
            wrapTime
        );


    if (
        calculated.reason ===
        "no-valid-guesses"
    ) {

        brokenGameCount++;

        addError(

            id,

            "invalid-guesses",

            "Nessun pronostico valido utilizzabile per il calcolo"

        );

        continue;

    }


    // ----------------------------------------------
    // RISULTATO UFFICIALE
    // ----------------------------------------------

    const finalResult = {

        ...official,

        points:
            winnerPoints(
                official
            ),

        source:
            "winners.json"

    };


    // ----------------------------------------------
    // CONTROLLO EXACT
    // ----------------------------------------------

    if (
        official.exactWinner &&
        official.winner
    ) {

        const officialGuess =
            guesses[
                official.winner
            ];

        const guessSec =
            toSeconds(
                officialGuess
            );

        const wrapSec =
            toSeconds(
                wrapTime
            );


        const reallyExact =
            guessSec !== null &&
            wrapSec !== null &&
            wrapSec >= guessSec &&
            wrapSec <= guessSec + 59;


        if (!reallyExact) {

            addWarning(

                id,

                "exact-mismatch",

                `${official.winner} è marcato -exact in winners.json ma il minuto del pronostico non coincide col wrap`,

                {

                    winner:
                        official.winner,

                    guess:
                        officialGuess || null,

                    wrapTime

                }

            );

        }

    }


    // ----------------------------------------------
    // CONFRONTO UFFICIALE / CALCOLATO
    // ----------------------------------------------

    /*
     * I Crazy Day rimangono esclusi dal confronto:
     * il risultato storico è autorevole e le regole
     * speciali non coincidono necessariamente con
     * il calcolo standard.
     */
    if (
        official &&
        !official.crazyWinner
    ) {

        let mismatch = false;


        if (official.noWinner) {

            mismatch =
                !calculated.noWinner;

        } else if (
            calculated.noWinner
        ) {

            mismatch = true;

        } else {

            const officialNames =
                [...official.winners]
                    .sort();

            const calculatedNames =
                [...calculated.winners]
                    .sort();


            const sameWinners =
                JSON.stringify(
                    officialNames
                ) ===
                JSON.stringify(
                    calculatedNames
                );


            const sameExact =
                Boolean(
                    official.exactWinner
                ) ===
                Boolean(
                    calculated.exactWinner
                );


            mismatch =
                !sameWinners ||
                !sameExact;

        }


        if (mismatch) {

            const officialLabel =
                official.noWinner
                    ? "no-winner"
                    : (
                        official.winners
                            .join(", ") +
                        (
                            official.exactWinner
                                ? " [EXACT]"
                                : ""
                        )
                    );


            const calculatedLabel =
                calculated.noWinner
                    ? "no-winner"
                    : (
                        calculated.winners
                            .join(", ") +
                        (
                            calculated.exactWinner
                                ? " [EXACT]"
                                : ""
                        )
                    );


            addWarning(

                id,

                "winner-mismatch",

                `Ufficiale: ${officialLabel} | Calcolato: ${calculatedLabel}`,

                {

                    official:
                        officialLabel,

                    calculated:
                        calculatedLabel

                }

            );

        }

    }


    // ----------------------------------------------
    // RISULTATO
    // ----------------------------------------------

    results.push({

        id,

        gameDate:
            day.gameDate,

        unit:
            day.unit,

        calculationMode:
            calculationMode(
                day.gameDate
            ),

        confidence:
            day.import
                ?.confidence ||
            null,

        messageDate:
            day.import
                ?.messageDate ||
            null,

        guesses,

        wrapTime,

        calculated: {

            winner:
                calculated.winner,

            winners:
                calculated.winners,

            exactWinner:
                calculated.exactWinner,

            points:
                calculated.points,

            noWinner:
                calculated.noWinner,

            reason:
                calculated.reason

        },

        manualWinner:
            officialWinnerValue,

        final:
            finalResult,

        crazyDay,

        status:
            "verified"

    });


    readyCount++;

}


// ======================================================
// ORDINE RISULTATI
// ======================================================

results.sort(
    (a, b) =>
        a.id.localeCompare(b.id)
);


// ======================================================
// SCRITTURA OUTPUT
// ======================================================

fs.writeFileSync(

    OUTPUT_FILE,

    JSON.stringify(
        results,
        null,
        2
    ) + "\n",

    "utf8"

);


fs.writeFileSync(

    VALIDATION_FILE,

    JSON.stringify(
        validation,
        null,
        2
    ) + "\n",

    "utf8"

);


fs.writeFileSync(

    FIXES_NEEDED_FILE,

    JSON.stringify(
        fixesNeeded,
        null,
        2
    ) + "\n",

    "utf8"

);


// ======================================================
// REPORT DATASET
// ======================================================

console.log("");
console.log("==================================");
console.log("DATASET UFFICIALE");
console.log("==================================");

console.log(
    `Voci in winners.json: ${officialEntries.length}`
);

console.log(
    `No-game: ${noGameCount}`
);

console.log(
    `Partite ufficiali: ${officialGameIds.length}`
);

console.log(
    `Crazy Day: ${crazyGameCount}`
);

console.log(
    `Partite pronte: ${readyCount}`
);

console.log(
    `Partite con errori: ${brokenGameCount}`
);


// ======================================================
// REPORT CRAZY DAY
// ======================================================

console.log("");
console.log("==================================");
console.log("CRAZY DAY");
console.log("==================================");


const crazyResults =
    results.filter(
        result =>
            result.final?.crazyWinner
    );


if (!crazyResults.length) {

    console.log(
        "Nessun Crazy Day."
    );

} else {

    for (
        const result
        of crazyResults
    ) {

        console.log("");
        console.log(
            `🎲 ${result.id}`
        );

        console.log(
            `   Winner: ${result.final.winner}` +
            `${
                result.final.exactWinner
                    ? " [EXACT]"
                    : ""
            }` +
            ` | +${result.final.points}`
        );


        const didNotVote =
            result.crazyDay
                ?.penalties
                ?.didNotVote ||
            [];


        const farthest =
            result.crazyDay
                ?.penalties
                ?.farthestFromWrap ||
            [];


        console.log(
            `   Non hanno votato: ${
                didNotVote.length
                    ? didNotVote.join(", ")
                    : "nessuno"
            }`
        );


        console.log(
            `   Più lontano: ${
                farthest.length
                    ? farthest.join(", ")
                    : "nessuno"
            }`
        );

    }

}


// ======================================================
// REPORT VALIDAZIONE
// ======================================================

console.log("");
console.log("==================================");
console.log("VALIDAZIONE");
console.log("==================================");

console.log(
    `ERROR: ${validation.errors.length}`
);

console.log(
    `WARNING: ${validation.warnings.length}`
);

console.log(
    `INFO: ${validation.info.length}`
);


// ======================================================
// ERROR
// ======================================================

if (validation.errors.length) {

    console.log("");
    console.log("==========");
    console.log("ERROR");
    console.log("==========");


    for (
        const issue
        of validation.errors
    ) {

        console.log(
            `❌ ${issue.id} ` +
            `[${issue.type}] ` +
            issue.message
        );


        if (
            issue.type ===
            "duplicate-selection-required"
        ) {

            for (
                const version
                of issue.versions || []
            ) {

                const suggested =
                    version.messageDate ===
                    issue.suggestedMessageDate
                        ? " ← SUGGERITA"
                        : "";

                console.log(
                    `   - ${version.messageDate}` +
                    ` | ${version.guesses} pronostici` +
                    suggested
                );

            }

        }


        if (
            issue.type ===
            "invalid-day-selection"
        ) {

            console.log(
                `   Selezionata: ${issue.selectedMessageDate}`
            );

            console.log(
                "   Disponibili:"
            );

            for (
                const messageDate
                of issue.availableVersions || []
            ) {

                console.log(
                    `   - ${messageDate}`
                );

            }

        }

    }

}


// ======================================================
// WARNING
// ======================================================

if (validation.warnings.length) {

    console.log("");
    console.log("==========");
    console.log("WARNING");
    console.log("==========");


    for (
        const issue
        of validation.warnings
    ) {

        console.log(
            `⚠️ ${issue.id} ` +
            `[${issue.type}] ` +
            issue.message
        );

    }

}


// ======================================================
// INFO
// ======================================================

if (validation.info.length) {

    console.log("");
    console.log("==========");
    console.log("INFO");
    console.log("==========");


    for (
        const issue
        of validation.info
    ) {

        console.log(
            `ℹ️ ${issue.id} ` +
            `[${issue.type}] ` +
            issue.message
        );

    }

}


// ======================================================
// STATO FINALE
// ======================================================

console.log("");
console.log("==================================");


if (validation.errors.length === 0) {

    console.log(
        "✅ DATASET PRONTO — ERROR: 0"
    );

} else {

    console.log(
        `❌ DATASET NON PRONTO — ${validation.errors.length} errori da correggere`
    );

    console.log("");

    console.log(
        `Controlla: ${FIXES_NEEDED_FILE}`
    );

    console.log(
        `Correzioni dati: ${MANUAL_FIXES_FILE}`
    );

    console.log(
        `Scelta duplicati: ${DAY_SELECTIONS_FILE}`
    );

    console.log(
        `Crazy Day: ${CRAZY_DAYS_FILE}`
    );

}


console.log("==================================");

console.log("");

console.log(
    `Risultati: ${OUTPUT_FILE}`
);

console.log(
    `Validation report: ${VALIDATION_FILE}`
);

console.log(
    `Fix necessari: ${FIXES_NEEDED_FILE}`
);