import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { importPlayers } from "../firestore/import-players.js";
import { importDays } from "../firestore/import-days.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DAYS_FILE = path.join(__dirname, "../output/days.json");
const PLAYERS_FILE = path.join(__dirname, "../output/players.json");

const days = JSON.parse(
    fs.readFileSync(DAYS_FILE, "utf8")
);

const players = JSON.parse(
    fs.readFileSync(PLAYERS_FILE, "utf8")
);

console.log("Connessione a Firestore...");

await importPlayers(players);

await importDays(days);

console.log("");
console.log("Import completato ✅");