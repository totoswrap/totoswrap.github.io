import aliases from "../config/player-aliases.json" with { type: "json" };

import { normalizeTime } from "../utils/utils.js";


function parseGuessLine(line) {

    /*
     * FORMATO 1
     *
     * 1:15 Marco
     * 01:15 Marco
     * 1.15 Marco
     * 01.15 Marco
     */
    let match = line.match(
        /^(\d{1,2}[:.]\d{2})\s+(.+)$/
    );

    if (match) {

        return {
            time: normalizeTime(match[1]),
            player: match[2].trim()
        };

    }


    /*
     * FORMATO 2
     *
     * Marco 1:15
     * Marco 01:15
     * Marco: 1:15
     * Marco: 01:15
     *
     * Escludiamo ":" e "→" dal nome per evitare
     * di leggere erroneamente le righe dei range.
     */
    match = line.match(
        /^([^:→]+?)\s*:?\s+(\d{1,2}[:.]\d{2})$/
    );

    if (match) {

        return {
            player: match[1].trim(),
            time: normalizeTime(match[2])
        };

    }


    return null;

}


export function extractGuesses(text) {

    const guesses = {};

    const lines = String(text || "")
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);


    for (const line of lines) {

        /*
         * Le righe dei range non sono pronostici:
         *
         * Marco → 16:00:00 → 01:20:00
         */
        if (line.includes("→"))
            continue;


        const parsed =
            parseGuessLine(line);

        if (!parsed)
            continue;


        const {
            player,
            time
        } = parsed;


        if (!player || !time)
            continue;


        /*
         * Vecchio formato:
         *
         * 18:30 Marco out
         */
        if (
            player
                .toLowerCase()
                .endsWith(" out")
        ) {
            continue;
        }


        const canonicalName =
            canonicalPlayerName(player);


        guesses[canonicalName] =
            time;

    }


    return {
        guesses
    };

}


export function canonicalPlayerName(name) {

    const key =
        name
            .trim()
            .toLowerCase();

    return (
        aliases[key] ||
        name.trim()
    );

}