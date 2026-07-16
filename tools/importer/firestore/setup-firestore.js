import db from "./firebase.js";

async function main() {

    console.log("Connessione a Firestore...");

    const settingsRef = db.collection("settings").doc("app");

    const snapshot = await settingsRef.get();

    if (snapshot.exists) {

        console.log("settings/app esiste già.");

    } else {

        await settingsRef.set({
            appName: "TotoSWrap",
            currentSeason: "season2",
            timezone: "Europe/Rome"
        });

        console.log("Creato settings/app");

    }

    console.log("Connessione riuscita ✅");

}

main().catch(console.error);