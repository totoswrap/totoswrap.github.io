import db from "./firebase.js";

export async function importPlayers(players) {

    console.log("");
    console.log("Import giocatori...");

    const batch = db.batch();

    for (const player of players) {

        const ref = db
            .collection("players")
            .doc(player.id);

        batch.set(ref, player);

    }

    await batch.commit();

    console.log(`✓ ${players.length} giocatori importati`);

}