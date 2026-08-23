import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ======================================================
// FILE
// ======================================================

const RESULTS_FILE = path.join(
    __dirname,
    "../output/calculated-results.json"
);

const OUTPUT_FILE = path.join(
    __dirname,
    "../output/migration-data.json"
);

const VALIDATION_FILE = path.join(
    __dirname,
    "../output/migration-validation.json"
);


// ======================================================
// LETTURA
// ======================================================

const calculatedResults = JSON.parse(
    fs.readFileSync(
        RESULTS_FILE,
        "utf8"
    )
);


// ======================================================
// VALIDAZIONE DI BASE
// ======================================================

const errors = [];
const warnings = [];
const info = [];


function addError(id, type, message) {

    errors.push({
        id,
        type,
        message
    });

}


function addWarning(id, type, message) {

    warnings.push({
        id,
        type,
        message
    });

}


function addInfo(id, type, message) {

    info.push({
        id,
        type,
        message
    });

}


// ======================================================
// UTILITIES
// ======================================================

function unique(values) {

    return [...new Set(values)];

}


function compareDays(a, b) {

    if (a.gameDate !== b.gameDate) {

        return a.gameDate.localeCompare(
            b.gameDate
        );

    }

    /*
     * Se nello stesso giorno esistono main e second,
     * main viene prima di second.
     */
    const order = {
        main: 0,
        second: 1
    };

    const unitA =
        order[a.unit] ?? 99;

    const unitB =
        order[b.unit] ?? 99;

    if (unitA !== unitB)
        return unitA - unitB;

    return a.id.localeCompare(b.id);

}


function clone(value) {

    return JSON.parse(
        JSON.stringify(value)
    );

}


// ======================================================
// RACCOLTA GIOCATORI
// ======================================================

const playerNames = new Set();


for (const day of calculatedResults) {

    for (
        const player
        of Object.keys(day.guesses || {})
    ) {

        playerNames.add(player);

    }

    for (
        const player
        of day.final?.winners || []
    ) {

        playerNames.add(player);

    }

    for (
        const change
        of day.crazyDay?.pointChanges || []
    ) {

        if (change.player)
            playerNames.add(change.player);

    }

}


const players =
    [...playerNames]
        .sort((a, b) =>
            a.localeCompare(b)
        );


// ======================================================
// POINT CHANGES
// ======================================================

function buildPointChanges(day) {

    /*
     * CRAZY DAY
     *
     * update-results.js ha già prodotto il ledger
     * completo della giornata.
     *
     * Non ricalcoliamo nulla qui.
     */
    if (day.final?.crazyWinner) {

        const changes =
            day.crazyDay?.pointChanges;

        if (
            !Array.isArray(changes) ||
            !changes.length
        ) {

            addError(
                day.id,
                "missing-crazy-point-changes",
                "Crazy Day senza crazyDay.pointChanges"
            );

            return [];

        }

        return clone(changes);

    }


    /*
     * NO WINNER
     *
     * Nessun movimento di punti.
     */
    if (day.final?.noWinner) {

        return [];

    }


    /*
     * PARTITA NORMALE / EXACT
     */
    const winners =
        day.final?.winners || [];

    if (!winners.length) {

        addError(
            day.id,
            "missing-winner",
            "La giornata non è no-winner ma non contiene vincitori"
        );

        return [];

    }


    const points =
        Number(day.final?.points);

    if (!Number.isFinite(points)) {

        addError(
            day.id,
            "invalid-points",
            `Punti finali non validi: ${day.final?.points}`
        );

        return [];

    }


    return winners.map(player => ({

        player,

        points,

        reason:
            day.final.exactWinner
                ? "exact-win"
                : "win"

    }));

}


// ======================================================
// COSTRUZIONE GIORNATE MIGRAZIONE
// ======================================================

const migrationDays = [];


for (
    const sourceDay
    of [...calculatedResults].sort(compareDays)
) {

    const day = clone(sourceDay);


    // --------------------------------------------------
    // VALIDAZIONI
    // --------------------------------------------------

    if (!day.id) {

        addError(
            "unknown",
            "missing-id",
            "Giornata senza id"
        );

        continue;

    }


    if (!day.gameDate) {

        addError(
            day.id,
            "missing-game-date",
            "gameDate mancante"
        );

    }


    if (!day.unit) {

        addError(
            day.id,
            "missing-unit",
            "unit mancante"
        );

    }


    if (day.status !== "verified") {

        addError(
            day.id,
            "not-verified",
            `Status inatteso: ${day.status}`
        );

    }


    if (!day.final) {

        addError(
            day.id,
            "missing-final-result",
            "Risultato finale mancante"
        );

        continue;

    }


    if (day.final.noGame) {

        /*
         * In teoria non dovrebbe mai succedere,
         * perché update-results.js esclude già
         * i no-game.
         */
        addError(
            day.id,
            "unexpected-no-game",
            "Una giornata no-game è arrivata nel dataset finale"
        );

        continue;

    }


    if (
        !day.guesses ||
        typeof day.guesses !== "object" ||
        Array.isArray(day.guesses)
    ) {

        addError(
            day.id,
            "invalid-guesses",
            "guesses non è un oggetto valido"
        );

    }


    if (!day.wrapTime) {

        addError(
            day.id,
            "missing-wrap-time",
            "wrapTime mancante"
        );

    }


    // --------------------------------------------------
    // LEDGER PUNTI
    // --------------------------------------------------

    const pointChanges =
        buildPointChanges(day);


    // --------------------------------------------------
    // RECORD MIGRAZIONE
    // --------------------------------------------------

    migrationDays.push({

        id:
            day.id,

        gameDate:
            day.gameDate,

        unit:
            day.unit,

        guesses:
            clone(day.guesses || {}),

        wrapTime:
            day.wrapTime,

        result: {

            winner:
                day.final.winner ?? null,

            winners:
                clone(
                    day.final.winners || []
                ),

            exactWinner:
                Boolean(
                    day.final.exactWinner
                ),

            noWinner:
                Boolean(
                    day.final.noWinner
                ),

            crazyDay:
                Boolean(
                    day.final.crazyWinner
                )

        },

        pointChanges,

        crazyDay:
            day.crazyDay
                ? clone(day.crazyDay)
                : null,

        metadata: {

            calculationMode:
                day.calculationMode || null,

            confidence:
                day.confidence || null,

            originalMessageDate:
                day.messageDate || null,

            resultSource:
                day.final.source || null,

            source:
                "historical-import"

        }

    });

}


// ======================================================
// CONTROLLO ID DUPLICATI
// ======================================================

const ids = new Set();


for (const day of migrationDays) {

    if (ids.has(day.id)) {

        addError(
            day.id,
            "duplicate-id",
            "ID duplicato nel dataset di migrazione"
        );

    }

    ids.add(day.id);

}


// ======================================================
// STATS
// ======================================================

function createPlayerStats(name) {

    return {

        name,

        points: 0,

        gamesPlayed: 0,

        gamesVoted: 0,

        wins: 0,

        exactWins: 0,

        crazyWins: 0,

        noVotePenalties: 0,

        farthestPenalties: 0,

        currentWinStreak: 0,

        longestWinStreak: 0

    };

}


const statsByPlayer = {};


for (const player of players) {

    statsByPlayer[player] =
        createPlayerStats(player);

}


// ======================================================
// CALCOLO STORICO
// ======================================================

for (const day of migrationDays) {

    const voters =
        Object.keys(day.guesses || {});

    const winners =
        day.result.winners || [];


    // --------------------------------------------------
    // GAMES PLAYED / VOTED
    // --------------------------------------------------

    /*
     * gamesPlayed:
     * il giocatore era coinvolto nella giornata.
     *
     * Per lo storico che abbiamo a disposizione,
     * possiamo determinare con certezza soltanto
     * chi ha votato.
     *
     * Nei Crazy Day conosciamo anche chi NON ha
     * votato grazie alle penalità.
     */

    const participants =
        new Set(voters);


    for (
        const player
        of day.crazyDay?.penalties
            ?.didNotVote || []
    ) {

        participants.add(player);

    }


    for (const player of participants) {

        if (!statsByPlayer[player]) {

            statsByPlayer[player] =
                createPlayerStats(player);

        }

        statsByPlayer[player]
            .gamesPlayed++;

    }


    for (const player of voters) {

        if (!statsByPlayer[player]) {

            statsByPlayer[player] =
                createPlayerStats(player);

        }

        statsByPlayer[player]
            .gamesVoted++;

    }


    // --------------------------------------------------
    // VITTORIE
    // --------------------------------------------------

    for (const player of winners) {

        if (!statsByPlayer[player]) {

            statsByPlayer[player] =
                createPlayerStats(player);

        }

        const stats =
            statsByPlayer[player];

        stats.wins++;


        if (day.result.exactWinner) {

            stats.exactWins++;

        }


        if (day.result.crazyDay) {

            stats.crazyWins++;

        }

    }


    // --------------------------------------------------
    // STREAK
    // --------------------------------------------------

    /*
     * Una streak continua soltanto se il giocatore
     * vince la giornata.
     *
     * Per tutti gli altri partecipanti viene
     * azzerata.
     */

    for (const player of participants) {

        const stats =
            statsByPlayer[player];

        if (winners.includes(player)) {

            stats.currentWinStreak++;

            stats.longestWinStreak =
                Math.max(
                    stats.longestWinStreak,
                    stats.currentWinStreak
                );

        } else {

            stats.currentWinStreak = 0;

        }

    }


    // --------------------------------------------------
    // PUNTI
    // --------------------------------------------------

    for (
        const change
        of day.pointChanges
    ) {

        const player =
            change.player;

        if (!statsByPlayer[player]) {

            statsByPlayer[player] =
                createPlayerStats(player);

        }


        statsByPlayer[player].points +=
            change.points;


        if (
            change.reason ===
            "did-not-vote"
        ) {

            statsByPlayer[player]
                .noVotePenalties++;

        }


        if (
            change.reason ===
            "farthest-from-wrap"
        ) {

            statsByPlayer[player]
                .farthestPenalties++;

        }

    }

}


// ======================================================
// CLASSIFICA
// ======================================================

const playerStats =
    Object.values(statsByPlayer)
        .sort((a, b) => {

            if (b.points !== a.points)
                return b.points - a.points;

            if (b.wins !== a.wins)
                return b.wins - a.wins;

            if (b.exactWins !== a.exactWins)
                return b.exactWins - a.exactWins;

            return a.name.localeCompare(
                b.name
            );

        });


// ======================================================
// SANITY CHECK PUNTI
// ======================================================

const ledgerTotal =
    migrationDays.reduce(
        (total, day) =>
            total +
            day.pointChanges.reduce(
                (sum, change) =>
                    sum + change.points,
                0
            ),
        0
    );


const statsTotal =
    playerStats.reduce(
        (total, player) =>
            total + player.points,
        0
    );


if (ledgerTotal !== statsTotal) {

    addError(
        "dataset",
        "points-total-mismatch",
        `Ledger=${ledgerTotal}, stats=${statsTotal}`
    );

}


// ======================================================
// OUTPUT
// ======================================================

const migrationData = {

    metadata: {

        generatedAt:
            new Date().toISOString(),

        source:
            "calculated-results.json",

        games:
            migrationDays.length,

        players:
            playerStats.length,

        ledgerTotalPoints:
            ledgerTotal

    },

    days:
        migrationDays,

    players:
        playerStats

};


fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
        migrationData,
        null,
        2
    ),
    "utf8"
);


// ======================================================
// VALIDATION REPORT
// ======================================================

const validationReport = {

    generatedAt:
        new Date().toISOString(),

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
// CONSOLE REPORT
// ======================================================

console.log("");
console.log("==================================");
console.log("MIGRATION DATASET");
console.log("==================================");
console.log("");

console.log(
    `Partite: ${migrationDays.length}`
);

console.log(
    `Giocatori: ${playerStats.length}`
);

console.log(
    `Movimenti punti: ${
        migrationDays.reduce(
            (total, day) =>
                total +
                day.pointChanges.length,
            0
        )
    }`
);

console.log(
    `Punti netti nel ledger: ${ledgerTotal}`
);


console.log("");
console.log("==================================");
console.log("CLASSIFICA RICOSTRUITA");
console.log("==================================");
console.log("");


playerStats.forEach(
    (player, index) => {

        console.log(
            `${String(index + 1).padStart(2, " ")}. ` +
            `${player.name.padEnd(18, " ")} ` +
            `${String(player.points).padStart(3, " ")} pt` +
            ` | W ${player.wins}` +
            ` | Exact ${player.exactWins}` +
            ` | Crazy ${player.crazyWins}` +
            ` | Games ${player.gamesPlayed}`
        );

    }
);


console.log("");
console.log("==================================");
console.log("VALIDAZIONE MIGRAZIONE");
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

    for (const error of errors) {

        console.log(
            `❌ ${error.id} ` +
            `[${error.type}] ` +
            error.message
        );

    }

}


if (warnings.length) {

    console.log("");
    console.log("==========");
    console.log("WARNING");
    console.log("==========");

    for (const warning of warnings) {

        console.log(
            `⚠️ ${warning.id} ` +
            `[${warning.type}] ` +
            warning.message
        );

    }

}


console.log("");
console.log("==================================");


if (!errors.length) {

    console.log(
        "✅ MIGRATION DATASET PRONTO"
    );

} else {

    console.log(
        `❌ MIGRATION DATASET NON PRONTO — ` +
        `${errors.length} errori`
    );

}


console.log("==================================");
console.log("");

console.log(
    `Dataset: ${OUTPUT_FILE}`
);

console.log(
    `Validation: ${VALIDATION_FILE}`
);

console.log("");