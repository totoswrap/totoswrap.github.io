import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import db from "../firebase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DAYS_FILE = path.join(__dirname, "../output/days.json");
const PLAYERS_FILE = path.join(__dirname, "../output/players.json");
const SEASON_ID = "season1";

const days = JSON.parse(
    fs.readFileSync(DAYS_FILE, "utf8")
);

const players = JSON.parse(
    fs.readFileSync(PLAYERS_FILE, "utf8")
);

async function importPlayers() {

    console.log("");
    console.log("Import giocatori...");

    for (const player of players) {

        await db
            .collection("players")
            .doc(player.id)
            .set(player);

        console.log(`✓ ${player.name}`);

    }

}

async function importDays() {

    console.log("");
    console.log("Import giornate...");

    for (const day of days) {

        await db
            .collection("seasons")
            .doc(SEASON_ID)
            .collection("days")
            .doc(day.gameDate)
            .set(day);

        console.log(`✓ ${day.gameDate}`);

    }

}

console.log("Connessione a Firestore...");

await importPlayers();

await importDays();

console.log("");
console.log("Import completato ✅");