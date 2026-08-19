import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYERS_FILE = path.join(
    __dirname,
    "../output/players.json"
);

const STATE_FILE = path.join(
    __dirname,
    "../output/state.json"
);

const players = JSON.parse(
    fs.readFileSync(PLAYERS_FILE, "utf8")
);

const state = {
    playerRoster: players.map(player => ({
        name: player.name,
        face: player.face
    })),

    scores: Object.fromEntries(
        players.map(player => [player.name, 0])
    ),

    days: [],

    today: null,

    _version: 1
};

fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(state, null, 2)
);

console.log("state.json creato ✅");