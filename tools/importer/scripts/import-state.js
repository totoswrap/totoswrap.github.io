import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import db from "../firestore/firebase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(
    __dirname,
    "../output/state.json"
);

const state = JSON.parse(
    fs.readFileSync(STATE_FILE, "utf8")
);

async function importState() {

    console.log("Import state...");

    await db
        .collection("totowrap")
        .doc("state")
        .set(state);

    console.log("state importato ✅");

}

await importState();