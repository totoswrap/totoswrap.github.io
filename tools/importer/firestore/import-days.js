import db from "./firebase.js";
import { seasonId } from "../utils/utils.js";

export async function importDays(days) {

    console.log("");
    console.log("Import giornate...");

    const batch = db.batch();

    for (const day of days) {

        const ref = db
            .collection("seasons")
            .doc(seasonId(day.gameDate))
            .collection("days")
            .doc(day.id);

        batch.set(ref, day);

    }

    await batch.commit();

    console.log(`✓ ${days.length} giornate importate`);

}