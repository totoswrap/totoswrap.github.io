const DAY_START_HOUR = 5;

export function normalizeTime(time) {

    let normalized = time
        .replace(".", ":")
        .replace("h", ":");

    const [hour, minute] = normalized.split(":");

    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

}

export function getGameDate(date, hour) {

    const gameDate = new Date(date);

    if (hour < DAY_START_HOUR) {
        gameDate.setDate(gameDate.getDate() - 1);
    }

    return gameDate.toISOString().slice(0,10);

}