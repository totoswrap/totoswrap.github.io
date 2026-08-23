const DAY_START_HOUR = 5;

export function normalizeTime(time) {

    let normalized = time
        .replace(".", ":")
        .replace("h", ":");

    const [hour, minute] = normalized.split(":");

    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

}

export function getGameDate(year, month, day, hour) {

    const yyyy = Number(year);
    const mm = Number(month);
    const dd = Number(day);
    const hh = Number(hour);

    /*
     * Usiamo UTC esclusivamente come strumento
     * per fare aritmetica sul calendario.
     *
     * Non stiamo convertendo un timestamp reale:
     * vogliamo semplicemente sapere quale data
     * appartiene alla giornata TotoWrap.
     */
    const gameDate = new Date(
        Date.UTC(yyyy, mm - 1, dd)
    );

    if (hh < DAY_START_HOUR) {
        gameDate.setUTCDate(
            gameDate.getUTCDate() - 1
        );
    }

    return gameDate
        .toISOString()
        .slice(0, 10);
}

export function confidence(count) {

    if (count >= 10) return "VERY_HIGH";
    if (count >= 6) return "HIGH";
    if (count >= 4) return "MEDIUM";

    return "LOW";

}

export function playerId(name) {

    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-");

}

export function detectUnit(text) {

    const upper = text.toUpperCase();

    if (upper.startsWith("MAIN"))
        return "main";

    if (
        upper.startsWith("SECOND") ||
        upper.startsWith("SPLINT") ||
        upper.startsWith("SPLINTER")
    )
        return "second";

    return "main";

}

export function seasonId(gameDate) {

    if (gameDate <= "2026-06-29")
        return "season1";

    return "season2";

}