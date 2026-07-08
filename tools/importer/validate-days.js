import fs from "fs";

const days = JSON.parse(
    fs.readFileSync("./output/days.json", "utf8")
);

console.log("");
console.log("==========");
console.log("VALIDAZIONE");
console.log("==========");
console.log("");

let ok = 0;

for (const day of days) {

    const problems = [];

    const players = Object.keys(day.guesses);

    if (players.length < 8) {
        problems.push(`solo ${players.length} giocatori`);
    }

    const duplicateNames = players.filter(
        (name, index) => players.indexOf(name) !== index
    );

    if (duplicateNames.length) {
        problems.push("nomi duplicati");
    }

    if (!day.gameDate) {
        problems.push("data mancante");
    }

    if (problems.length === 0) {

        ok++;

    } else {

        console.log(day.gameDate);

        for (const p of problems) {
            console.log("  •", p);
        }

        console.log("");

    }

}

console.log("==========");
console.log(`${ok}/${days.length} giornate valide`);
console.log("==========");