import fs from "fs";

const CHAT_FILE = "./input/_chat.txt";
const DAY_START_HOUR = 5;

const text = fs.readFileSync(CHAT_FILE, "utf8");

// divide il file nei singoli messaggi WhatsApp
const messages = text.split(
    /\n(?=\[\d{2}\/\d{2}\/\d{2}, \d{2}:\d{2}:\d{2}\])/
);

console.log(`Messaggi trovati: ${messages.length}`);

function getGameDate(date, hour) {

    const gameDate = new Date(date);

    if (hour < DAY_START_HOUR) {
        gameDate.setDate(gameDate.getDate() - 1);
    }

    return gameDate.toISOString().slice(0,10);

}

const GUESS_REGEX = /^(\d{1,2}[:.]\d{2})\s+(.+)$/gm;
const MIN_GUESSES = 4;

function normalizeTime(time) {

    let normalized = time
        .replace(".", ":")
        .replace("h", ":");

    const [hour, minute] = normalized.split(":");

    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

}

function extractGuesses(text) {

    const guesses = {};
    const outs = {};

    const matches = [...text.matchAll(GUESS_REGEX)];

    for (const match of matches) {

        const time = normalizeTime(match[1]);
        const player = match[2].trim();

        if (player.toLowerCase().endsWith(" out")) {

            const realName = player.slice(0, -4).trim();

            outs[realName] = time;

        } else {

            guesses[player] = time;

        }

    }

    return {
        guesses,
        outs
    };

}

function confidence(count){

    if(count >= 10) return "VERY_HIGH";
    if(count >= 6) return "HIGH";
    if(count >= 4) return "MEDIUM";

    return "LOW";

}

let edoardoMessages = [];

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

fs.writeFileSync(
    "./output/days.json",
    JSON.stringify(days, null, 2)
);

console.log("");
console.log("days.json creato!");