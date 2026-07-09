import aliases from "../config/player-aliases.json" with { type: "json" };
import { normalizeTime } from "../utils/utils.js";

const GUESS_REGEX = /^(\d{1,2}[:.]\d{2})\s+(.+)$/gm;

export function extractGuesses(text) {

    const guesses = {};
    const outs = {};

    const matches = [...text.matchAll(GUESS_REGEX)];

    for (const match of matches) {

        const time = normalizeTime(match[1]);

        const player = match[2].trim();

        const canonicalName = canonicalPlayerName(player);

        if (canonicalName.toLowerCase().endsWith(" out")) {

            const realName = canonicalName.slice(0, -4).trim();

            outs[realName] = time;

        } else {

            guesses[canonicalName] = time;

        }

    }

    return {
        guesses,
        outs
    };

}

export function canonicalPlayerName(name) {

    const key = name.trim().toLowerCase();

    return aliases[key] || name.trim();

}