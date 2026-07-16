import aliases from "../config/player-aliases.json" with { type: "json" };
import { normalizeTime } from "../utils/utils.js";

const GUESS_REGEX = /^(\d{1,2}[:.]\d{2})\s+(.+)$/gm;

export function extractGuesses(text) {

    const guesses = {};

    const matches = [...text.matchAll(GUESS_REGEX)];

    for (const match of matches) {

        const time = normalizeTime(match[1]);

        const player = match[2].trim();

        if (player.toLowerCase().endsWith(" out")) {
            continue;
        }

        const canonicalName = canonicalPlayerName(player);

        guesses[canonicalName] = time;

    }

    return {
        guesses
    };

}

export function canonicalPlayerName(name) {

    const key = name.trim().toLowerCase();

    return aliases[key] || name.trim();

}