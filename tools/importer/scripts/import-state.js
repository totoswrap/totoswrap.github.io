import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import db from "../firestore/firebase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(
    __dirname,
    "../output/final-state.json"
);

const state = JSON.parse(
    fs.readFileSync(STATE_FILE, "utf8")
);

function validateState(state) {

    if (!state || typeof state !== "object") {
        throw new Error("final-state.json non valido");
    }

    if (!Array.isArray(state.playerRoster)) {
        throw new Error("playerRoster mancante o non valido");
    }

    if (!state.scores || typeof state.scores !== "object") {
        throw new Error("scores mancante o non valido");
    }

    if (!Array.isArray(state.days)) {
        throw new Error("days mancante o non valido");
    }

    if (state.days.length !== 109) {
        throw new Error(
            `Numero partite inatteso: ${state.days.length} invece di 109`
        );
    }

    if (state.playerRoster.length !== 21) {
        throw new Error(
            `Numero giocatori inatteso: ${state.playerRoster.length} invece di 21`
        );
    }

    if (state.today !== null) {
        throw new Error(
            "today deve essere null prima della migrazione"
        );
    }

    const totalPoints = Object.values(state.scores)
        .reduce((sum, value) => sum + Number(value || 0), 0);

    if (totalPoints !== 126) {
        throw new Error(
            `Totale punti inatteso: ${totalPoints} invece di 126`
        );
    }

    console.log("Validazione pre-import OK");
    console.log(`Partite: ${state.days.length}`);
    console.log(`Roster: ${state.playerRoster.length}`);
    console.log(`Punti netti: ${totalPoints}`);
    console.log(`Today: ${state.today}`);
}

async function importState() {

    console.log("==================================");
    console.log("IMPORT FINAL STATE");
    console.log("==================================");

    validateState(state);

    console.log("");
    console.log("Import state in Firestore...");

    await db
        .collection("totowrap")
        .doc("state")
        .set(state);

    console.log("");
    console.log("==================================");
    console.log("✅ FINAL STATE IMPORTATO");
    console.log("==================================");
}

await importState();