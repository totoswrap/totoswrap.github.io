import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ======================================================
// FILE
// ======================================================

const STATE_FILE = path.join(
    __dirname,
    "../output/state.json"
);

const MIGRATION_FILE = path.join(
    __dirname,
    "../output/migration-data.json"
);

const OUTPUT_FILE = path.join(
    __dirname,
    "../output/final-state.json"
);

const VALIDATION_FILE = path.join(
    __dirname,
    "../output/final-state-validation.json"
);


// ======================================================
// COSTANTI / ATTESE
// ======================================================

const EXPECTED_DAYS = 109;
const EXPECTED_LEDGER_TOTAL = 126;

const DAY_START_HOUR = 5;


// ======================================================
// LETTURA
// ======================================================

const currentState = JSON.parse(
    fs.readFileSync(
        STATE_FILE,
        "utf8"
    )
);

const migration = JSON.parse(
    fs.readFileSync(
        MIGRATION_FILE,
        "utf8"
    )
);


// ======================================================
// VALIDAZIONE
// ======================================================

const errors = [];
const warnings = [];
const info = [];


function addError(
    id,
    type,
    message
) {

    errors.push({
        id,
        type,
        message
    });

}


function addWarning(
    id,
    type,
    message
) {

    warnings.push({
        id,
        type,
        message
    });

}


function addInfo(
    id,
    type,
    message
) {

    info.push({
        id,
        type,
        message
    });

}


// ======================================================
// UTILITY
// ======================================================

function clone(value) {

    return JSON.parse(
        JSON.stringify(value)
    );

}


function pad(value) {

    return String(value)
        .padStart(2, "0");

}


function addDaysISO(
    iso,
    amount
) {

    const [
        year,
        month,
        day
    ] = iso.split("-").map(Number);

    const date = new Date(
        Date.UTC(
            year,
            month - 1,
            day
        )
    );

    date.setUTCDate(
        date.getUTCDate() + amount
    );

    return date
        .toISOString()
        .slice(0, 10);

}


function hourFromTime(time) {

    const match =
        String(time || "")
            .match(/^(\d{1,2}):/);

    if (!match)
        return null;

    const hour =
        Number(match[1]);

    return Number.isFinite(hour)
        ? hour
        : null;

}


/*
 * Tutto ciò che avviene tra 00:00 e 04:59
 * appartiene alla notte successiva rispetto
 * al gameDate TotoWrap.
 */
function eventDateForTime(
    gameDate,
    time
) {

    const hour =
        hourFromTime(time);

    if (
        hour !== null &&
        hour < DAY_START_HOUR
    ) {

        return addDaysISO(
            gameDate,
            1
        );

    }

    return gameDate;

}


function normalizeWrapTime(time) {

    const value =
        String(time || "")
            .trim();

    /*
     * Lo storico normalmente contiene HH:MM.
     * L'app accetta anche HH:MM:SS.
     *
     * Manteniamo esattamente il dato disponibile.
     */
    return value;

}


// ======================================================
// ROSTER
// ======================================================

const playerRoster =
    Array.isArray(currentState.playerRoster)
        ? clone(currentState.playerRoster)
        : [];


// Giocatrici attive entrate dopo lo state di partenza
const ACTIVE_PLAYERS_TO_ADD = [
    "Chiara",
    "Ivana"
];


for (const name of ACTIVE_PLAYERS_TO_ADD) {

    const alreadyExists =
        playerRoster.some(
            player =>
                String(player?.name || "")
                    .trim()
                    .toLowerCase() ===
                name.toLowerCase()
        );

    if (!alreadyExists) {

        playerRoster.push({
            name,
            face: name
        });

    }

}


const rosterNames =
    new Set(
        playerRoster.map(
            player =>
                player.name
        )
    );


// ======================================================
// SCORES DAL LEDGER
// ======================================================

const ledgerScores = {};


for (
    const day
    of migration.days || []
) {

    for (
        const change
        of day.pointChanges || []
    ) {

        const player =
            String(
                change.player || ""
            ).trim();

        const points =
            Number(
                change.points
            );

        if (
            !player ||
            !Number.isFinite(points)
        ) {

            addError(
                day.id,
                "invalid-point-change",
                `Movimento punti non valido: ${JSON.stringify(change)}`
            );

            continue;

        }


        ledgerScores[player] =
            (
                ledgerScores[player] ||
                0
            ) + points;

    }

}


// ======================================================
// SCORE STATE
// ======================================================

/*
 * Manteniamo tutti i giocatori storici nel dizionario
 * scores, anche se non sono nel roster attivo.
 *
 * In questo modo nessun dato viene perso.
 * La UI principale continuerà comunque a mostrare
 * soltanto playerRoster.
 */
const scores = {};


for (
    const player
    of Object.keys(
        ledgerScores
    )
) {

    scores[player] =
        ledgerScores[player];

}


/*
 * Ogni giocatore attualmente nel roster deve comunque
 * avere una voce in scores.
 */
for (
    const player
    of playerRoster
) {

    if (
        !Object.prototype
            .hasOwnProperty
            .call(
                scores,
                player.name
            )
    ) {

        scores[player.name] = 0;

    }

}


// ======================================================
// GUESS ARRAY NATIVO
// ======================================================

function buildGuessArray(day) {

    return Object
        .entries(
            day.guesses || {}
        )
        .map(
            ([name, time]) => ({

                name,

                time,

                date:
                    eventDateForTime(
                        day.gameDate,
                        time
                    )

            })
        );

}


// ======================================================
// PENALITÀ CRAZY DAY
// ======================================================

function buildPenalties(day) {

    if (!day.result?.crazyDay)
        return [];


    const penalties = [];


    for (
        const player
        of day.crazyDay
            ?.penalties
            ?.didNotVote || []
    ) {

        penalties.push({

            name:
                player,

            points:
                -1,

            reason:
                "missed-bet"

        });

    }


    for (
        const player
        of day.crazyDay
            ?.penalties
            ?.farthestFromWrap || []
    ) {

        penalties.push({

            name:
                player,

            points:
                -1,

            reason:
                "furthest-from-wrap"

        });

    }


    return penalties;

}


// ======================================================
// CRAZY DAY CONFIG NATIVO
// ======================================================

function buildCrazyDayConfig(day) {

    if (!day.result?.crazyDay)
        return null;


    return {

        enabled: true,

        regularPoints: 2,

        perfectPoints: 4,

        penaltyPoints: -1

    };

}


// ======================================================
// GIORNATA NATIVA
// ======================================================

function buildNativeDay(day) {

    const guesses =
        buildGuessArray(day);

    const winners =
        (day.result?.winners || [])
            .map(
                name => ({
                    name
                })
            );


    const points =
        day.result?.noWinner
            ? 0
            : Number(
                day.pointChanges
                    ?.find(
                        change =>
                            winners.some(
                                winner =>
                                    winner.name ===
                                    change.player
                            )
                    )
                    ?.points
            );


    if (
        !day.result?.noWinner &&
        !Number.isFinite(points)
    ) {

        addError(
            day.id,
            "missing-winner-points",
            "Impossibile determinare i punti del vincitore"
        );

    }


    return {

        /*
         * Campo addizionale innocuo ma utile
         * per mantenere un riferimento stabile
         * alla giornata storica.
         */
        id:
            day.id,

        date:
            day.gameDate,

        unit:
            day.unit,

        guesses,

        wrapTime:
            normalizeWrapTime(
                day.wrapTime
            ),

        winner:
            day.result?.noWinner
                ? "Nobody wins, everytuna's happy!"
                : (
                    day.result?.winner ||
                    null
                ),

        winners,

        points:
            day.result?.noWinner
                ? 0
                : points,

        noWinner:
            Boolean(
                day.result?.noWinner
            ),

        penalties:
            buildPenalties(day),

        crazyDay:
            buildCrazyDayConfig(day),

        /*
         * La giornata viene fatta partire alle 05:00.
         *
         * Questo rende normalizeGameSec()
         * coerente con la stessa convenzione usata
         * dall'importer storico:
         *
         * 00:00–04:59 = notte successiva.
         */
        approvedAt:
            "05:00",

        approvedDate:
            day.gameDate,

        /*
         * Non conosciamo necessariamente lo storico
         * dell'estimated wrap.
         */
        estWrap:
            null,

        estWrapDate:
            null,

        betCloseAt:
            null,

        /*
         * Metadata aggiuntivi: normalizeState()
         * conserva i campi extra.
         */
        historicalImport: {

            source:
                "migration-data.json",

            calculationMode:
                day.metadata
                    ?.calculationMode ||
                null,

            confidence:
                day.metadata
                    ?.confidence ||
                null,

            originalMessageDate:
                day.metadata
                    ?.originalMessageDate ||
                null

        }

    };

}


// ======================================================
// DAYS
// ======================================================

const nativeDays =
    (migration.days || [])
        .map(
            buildNativeDay
        );


// ======================================================
// VALIDAZIONE DAYS
// ======================================================

if (
    nativeDays.length !==
    EXPECTED_DAYS
) {

    addError(
        "dataset",
        "unexpected-day-count",
        `Attese ${EXPECTED_DAYS} giornate, trovate ${nativeDays.length}`
    );

}


const dayIds =
    new Set();


for (const day of nativeDays) {

    if (!day.id) {

        addError(
            "unknown",
            "missing-day-id",
            "Giornata senza id"
        );

        continue;

    }


    if (dayIds.has(day.id)) {

        addError(
            day.id,
            "duplicate-day-id",
            "ID duplicato"
        );

    }


    dayIds.add(day.id);


    if (
        !Array.isArray(
            day.guesses
        ) ||
        !day.guesses.length
    ) {

        addError(
            day.id,
            "missing-guesses",
            "Giornata senza pronostici"
        );

    }


    if (!day.wrapTime) {

        addError(
            day.id,
            "missing-wrap",
            "Giornata senza wrapTime"
        );

    }


    if (
        !day.noWinner &&
        !day.winners.length
    ) {

        addError(
            day.id,
            "missing-winners",
            "Giornata vincente senza winners"
        );

    }

}


// ======================================================
// VALIDAZIONE CRAZY DAYS
// ======================================================

const crazyDays =
    nativeDays.filter(
        day =>
            day.crazyDay?.enabled
    );


if (crazyDays.length !== 3) {

    addError(
        "dataset",
        "unexpected-crazy-day-count",
        `Attesi 3 Crazy Day, trovati ${crazyDays.length}`
    );

}


for (const day of crazyDays) {

    if (
        day.crazyDay.regularPoints !== 2 ||
        day.crazyDay.perfectPoints !== 4 ||
        day.crazyDay.penaltyPoints !== -1
    ) {

        addError(
            day.id,
            "invalid-crazy-scoring",
            "Configurazione Crazy Day non corretta"
        );

    }

}


// ======================================================
// VALIDAZIONE LEDGER
// ======================================================

const ledgerTotal =
    Object.values(
        ledgerScores
    )
    .reduce(
        (sum, value) =>
            sum + value,
        0
    );


if (
    ledgerTotal !==
    EXPECTED_LEDGER_TOTAL
) {

    addError(
        "dataset",
        "unexpected-ledger-total",
        `Attesi ${EXPECTED_LEDGER_TOTAL} punti netti, trovati ${ledgerTotal}`
    );

}


// ======================================================
// VERIFICA CLASSIFICA ATTESA
// ======================================================

const EXPECTED_SCORES = {

    Marco: 11,
    Giulia: 10,
    Edoardo: 13,
    Isabel: 9,
    Jai: 1,
    Lawrence: 7,
    Veronica: 8,
    Tiberio: 5,
    Flaminia: 13,
    "Alessandro M": 1,
    Conor: 8,
    Sara: 4,
    Roberta: 11,
    Lior: 3,
    Euridilla: 4,
    Nicolas: 7,
    Francesca: 5,
    "Maria Claudia": 6,
    "Alessandro L": 0,
    Chiara: 0,
    Ivana: 0

};


for (
    const [
        player,
        expected
    ]
    of Object.entries(
        EXPECTED_SCORES
    )
) {

    const actual =
        scores[player] || 0;


    if (actual !== expected) {

        addError(
            player,
            "score-mismatch",
            `Atteso ${expected}, trovato ${actual}`
        );

    }

}


// ======================================================
// INFO ROSTER STORICO
// ======================================================

for (
    const player
    of Object.keys(scores)
) {

    if (
        !rosterNames.has(player)
    ) {

        addInfo(
            player,
            "historical-player-not-in-roster",
            "Presente nello storico ma non nel roster attivo"
        );

    }

}


// ======================================================
// COSTRUZIONE STATE
// ======================================================

const finalState = {

    /*
     * Conserviamo eventuali campi aggiuntivi
     * presenti nello state corrente.
     */
    ...clone(currentState),

    playerRoster,

    scores,

    days:
        nativeDays,

    today:
        null,

    /*
     * Non incrementiamo qui la versione.
     * Sarà lo script di import / Firestore
     * a gestire la scrittura vera.
     */
    _version:
        Number(
            currentState._version
        ) || 0

};


// ======================================================
// OUTPUT
// ======================================================

fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
        finalState,
        null,
        2
    ),
    "utf8"
);


const validationReport = {

    generatedAt:
        new Date()
            .toISOString(),

    summary: {

        days:
            nativeDays.length,

        crazyDays:
            crazyDays.length,

        rosterPlayers:
            playerRoster.length,

        scoreEntries:
            Object.keys(scores).length,

        ledgerTotal,

        errors:
            errors.length,

        warnings:
            warnings.length,

        info:
            info.length

    },

    errors,
    warnings,
    info

};


fs.writeFileSync(
    VALIDATION_FILE,
    JSON.stringify(
        validationReport,
        null,
        2
    ),
    "utf8"
);


// ======================================================
// REPORT
// ======================================================

console.log("");
console.log("==================================");
console.log("FINAL STATE");
console.log("==================================");
console.log("");

console.log(
    `Days: ${nativeDays.length}`
);

console.log(
    `Crazy Days: ${crazyDays.length}`
);

console.log(
    `Roster attivo: ${playerRoster.length}`
);

console.log(
    `Giocatori nello storico: ${Object.keys(scores).length}`
);

console.log(
    `Punti netti: ${ledgerTotal}`
);


console.log("");
console.log("==================================");
console.log("SCORES");
console.log("==================================");
console.log("");


Object.entries(scores)
    .sort(
        ([nameA, scoreA], [nameB, scoreB]) => {

            if (scoreB !== scoreA)
                return scoreB - scoreA;

            return nameA.localeCompare(
                nameB
            );

        }
    )
    .forEach(
        ([name, score]) => {

            const rosterLabel =
                rosterNames.has(name)
                    ? ""
                    : " [storico]";

            console.log(
                `${name.padEnd(18, " ")} ` +
                `${String(score).padStart(3, " ")} pt` +
                rosterLabel
            );

        }
    );


console.log("");
console.log("==================================");
console.log("VALIDAZIONE");
console.log("==================================");
console.log("");

console.log(
    `ERROR: ${errors.length}`
);

console.log(
    `WARNING: ${warnings.length}`
);

console.log(
    `INFO: ${info.length}`
);


if (errors.length) {

    console.log("");
    console.log("==========");
    console.log("ERROR");
    console.log("==========");


    for (const issue of errors) {

        console.log(
            `❌ ${issue.id} ` +
            `[${issue.type}] ` +
            issue.message
        );

    }

}


if (warnings.length) {

    console.log("");
    console.log("==========");
    console.log("WARNING");
    console.log("==========");


    for (const issue of warnings) {

        console.log(
            `⚠️ ${issue.id} ` +
            `[${issue.type}] ` +
            issue.message
        );

    }

}


if (info.length) {

    console.log("");
    console.log("==========");
    console.log("INFO");
    console.log("==========");


    for (const issue of info) {

        console.log(
            `ℹ️ ${issue.id} ` +
            `[${issue.type}] ` +
            issue.message
        );

    }

}


console.log("");
console.log("==================================");


if (!errors.length) {

    console.log(
        "✅ FINAL STATE PRONTO"
    );

} else {

    console.log(
        `❌ FINAL STATE NON PRONTO — ${errors.length} errori`
    );

}


console.log("==================================");
console.log("");

console.log(
    `State: ${OUTPUT_FILE}`
);

console.log(
    `Validation: ${VALIDATION_FILE}`
);

console.log("");