import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHAT_FILE = path.join(
    __dirname,
    "../input/_chat.txt"
);

const OUTPUT_FILE = path.join(
    __dirname,
    "../output/edoardo-messages.txt"
);

const TARGET_AUTHOR = "Edoardo";

/*
 * Formato WhatsApp:
 *
 * [19/08/26, 18:48:18] Edoardo: Btw Flaminia officially won...
 *
 * Il lookahead permette di mantenere insieme anche eventuali
 * messaggi multilinea.
 */
const MESSAGE_SPLIT_REGEX =
    /\n(?=\[\d{2}\/\d{2}\/\d{2}, \d{2}:\d{2}:\d{2}\])/;

const MESSAGE_REGEX =
    /^\[(\d{2}\/\d{2}\/\d{2}), (\d{2}:\d{2}:\d{2})\] ([^:]+):\s*([\s\S]*)$/;

function extractEdoardoMessages() {

    const chat = fs.readFileSync(CHAT_FILE, "utf8");

    const messages = chat.split(MESSAGE_SPLIT_REGEX);

    const edoardoMessages = [];

    for (const rawMessage of messages) {

        const match = rawMessage.match(MESSAGE_REGEX);

        if (!match)
            continue;

        const [, date, time, author, text] = match;

        if (author.trim() !== TARGET_AUTHOR)
            continue;

        edoardoMessages.push({
            date,
            time,
            text: text.trim()
        });

    }

    return edoardoMessages;
}

function buildOutput(messages) {

    return messages
        .map(message =>
            `[${message.date}, ${message.time}] ${message.text}`
        )
        .join("\n\n");

}

const messages = extractEdoardoMessages();

fs.mkdirSync(
    path.dirname(OUTPUT_FILE),
    { recursive: true }
);

fs.writeFileSync(
    OUTPUT_FILE,
    buildOutput(messages),
    "utf8"
);

console.log("");
console.log("Estrazione messaggi Edoardo...");
console.log("");
console.log(`Messaggi trovati: ${messages.length}`);
console.log("");
console.log(`File creato: ${OUTPUT_FILE}`);