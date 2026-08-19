import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import db from "../firestore/firebase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(
    __dirname,
    "../output/state.json"
);

async function loadPlayers() {

    const snapshot = await db
        .collection("players")
        .get();

    return snapshot.docs.map(doc => doc.data());

}

async function loadSeason(seasonId) {

    const seasonDoc = await db
        .collection("seasons")
        .doc(seasonId)
        .get();

    if (!seasonDoc.exists)
        return null;

    const daysSnapshot = await db
        .collection("seasons")
        .doc(seasonId)
        .collection("days")
        .orderBy("gameDate")
        .get();

    return {
        ...seasonDoc.data(),
        days: daysSnapshot.docs.map(doc => doc.data())
    };

}

console.log("Caricamento Firestore...");

const players = await loadPlayers();

const seasons = [];

for (const id of ["season1", "season2"]) {

    const season = await loadSeason(id);

    if (season)
        seasons.push(season);

}

const days = seasons
    .flatMap(season => season.days)
    .sort((a, b) => {

        if (a.gameDate !== b.gameDate)
            return a.gameDate.localeCompare(b.gameDate);

        return a.unit.localeCompare(b.unit);

    });

const state = {

    generatedAt: new Date().toISOString(),

    playerRoster: players,

    days,

    scores: {},

    today: null,

    _version: 1

};

fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(state, null, 2)
);

console.log("state.json creato ✅");