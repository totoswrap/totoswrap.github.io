import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { extractGuesses } from "../utils/guess-parser.js";
import {
    getGameDate,
    confidence,
    playerId
} from "../utils/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHAT_FILE = path.join(__dirname, "../input/_chat.txt");
const text = fs.readFileSync(CHAT_FILE, "utf8");
const DAYS_FILE = path.join(__dirname, "../output/days.json");
const PLAYERS_FILE = path.join(__dirname, "../output/players.json");
const MIN_GUESSES = 4;

// divide il file nei singoli messaggi WhatsApp
const messages = text.split(
    /\n(?=\[\d{2}\/\d{2}\/\d{2}, \d{2}:\d{2}:\d{2}\])/
);

console.log(`Messaggi trovati: ${messages.length}`);

const edoardoMessages = [];

for (const message of messages) {

    const match = message.match(
        /^\[(\d{2})\/(\d{2})\/(\d{2}), (\d{2}):(\d{2}):(\d{2})\] (.*?):/
    );

    if (!match) continue;

    const [
        ,
        day,
        month,
        year,
        hour,
        minute,
        second,
        author
    ] = match;

    if (author !== "Edoardo") continue;

    const date = new Date(
        `20${year}-${month}-${day}T${hour}:${minute}:${second}`
    );

    edoardoMessages.push({
        author,
        messageDate: date.toISOString(),
        gameDate: getGameDate(date, Number(hour)),
        text: message.substring(match[0].length).trim()
    });

}

console.log(`Messaggi di Edoardo: ${edoardoMessages.length}`);

const days = [];

const daysByDate = {};

for(const msg of edoardoMessages){

    const result = extractGuesses(msg.text);

    const count = Object.keys(result.guesses).length;

    if(count < MIN_GUESSES)
        continue;

    days.push({

        gameDate: msg.gameDate,

        messageDate: msg.messageDate,

        confidence: confidence(count),

        guesses: result.guesses,

        outs: result.outs

    });

    if (!daysByDate[msg.gameDate]) {
        daysByDate[msg.gameDate] = [];
    }

    daysByDate[msg.gameDate].push({
        messageDate: msg.messageDate,
        guesses: Object.keys(result.guesses).length,
        outs: Object.keys(result.outs).length
    });

}

console.log("");
console.log("==========");
console.log(`Giornate trovate: ${days.length}`);
console.log("==========");
console.log("");

for(const day of days){

    console.log(day.gameDate,
        `(${Object.keys(day.guesses).length} pronostici)`,
        day.confidence);

}

let totalGuesses = 0;
let totalOuts = 0;

for (const day of days) {

    totalGuesses += Object.keys(day.guesses).length;
    totalOuts += Object.keys(day.outs).length;

}

console.log("");
console.log("==========");
console.log(`Giornate: ${days.length}`);
console.log(`Pronostici: ${totalGuesses}`);
console.log(`Out: ${totalOuts}`);
console.log("==========");

console.log("");
console.log("==========");
console.log("Giornate duplicate");
console.log("==========");

let duplicateCount = 0;

for (const [date, entries] of Object.entries(daysByDate)) {

    if (entries.length <= 1)
        continue;

    duplicateCount++;

    console.log(`\n${date}`);

    entries.forEach((entry, index) => {

        console.log(
            `  [${index + 1}] ${entry.guesses} pronostici, ${entry.outs} out - ${entry.messageDate}`
        );

    });

}

console.log("");
console.log(`Totale giornate duplicate: ${duplicateCount}`);

const players = new Map();

for (const day of days) {

    for (const player of Object.keys(day.guesses)) {

        const id = playerId(player);

        players.set(id, {
            id,
            name: player
        });

    }

}

const playersList = [...players.values()];

fs.writeFileSync(
    PLAYERS_FILE,
    JSON.stringify(playersList, null, 2)
);

console.log("players.json creato!");

fs.writeFileSync(DAYS_FILE, JSON.stringify(days, null, 2));

console.log("days.json creato!");