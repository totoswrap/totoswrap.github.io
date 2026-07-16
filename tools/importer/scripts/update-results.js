import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import db from "../firestore/firebase.js";
import { seasonId } from "../utils/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WRAP_TIMES_FILE = path.join(
    __dirname,
    "../input/wrap-times.json"
);

const wrapTimes = JSON.parse(
    fs.readFileSync(WRAP_TIMES_FILE, "utf8")
);

async function updateResults() {

    const batch = db.batch();

    let count = 0;

    for (const [dayId, wrapTime] of Object.entries(wrapTimes)) {

        const gameDate = dayId.split("-").slice(0, 3).join("-");
        const season = seasonId(gameDate);

        const ref = db
            .collection("seasons")
            .doc(season)
            .collection("days")
            .doc(dayId);

        const doc = await ref.get();

        if (!doc.exists) {

            console.log(`⚠️ ${dayId} non esiste nel database`);

            continue;

        }

        batch.update(ref, {
            "result.wrapTime": wrapTime
        });

        console.log(`✓ ${dayId} -> ${wrapTime}`);

        count++;

    }

    await batch.commit();

    console.log("");
    console.log(`${count} giornate aggiornate ✅`);

}

console.log("Aggiornamento risultati...");

await updateResults();