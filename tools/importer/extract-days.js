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
        preview: message.substring(match[0].length).trim().slice(0,80)
    });

}

console.log(`Messaggi di Edoardo: ${edoardoMessages.length}`);

console.log(edoardoMessages.slice(0,10));