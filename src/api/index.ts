import { logger, waitFor } from "../common";
import { settingsMBSLoaded, bcLoaded } from "../common_bc";

import * as wheelOutfits from "./wheel_outfits";
import * as css from "./css";

export { wheelOutfits, css };

/**
 * The version of the MBS API.
 *
 * - Changes or removals are accompanied by a `major` increment (and resetting `minor` back to 0)
 * - Additions are only accompanied by a `minor` increment
 */
export const API_VERSION = Object.freeze({
    /** The major API versions; increments are reserved for changes and removals */
    major: 1,
    /** The minor API versions; increments are reserved for additions */
    minor: 4,
}) satisfies typeof mbs.API_VERSION;

function jsonStringifier(key: string, value: any) {
    if (value instanceof Set) {
        return Array.from(value);
    } else if (value instanceof Map) {
        return Object.fromEntries(value);
    } else if (value instanceof Error) {
        return { ...value };
    } else if (value instanceof Date) {
        return value.toString();
    } else {
        return value;
    }
}

/**
 * Return MBS debug output in human-readable, JSON-safe, stringified form.
 *
 * Note that the API provides no guarantees regarding the outputs machine readability (beyond being JSON-safe), and MBS is free to change its structure at any point without prior warning
 * @returns The MBS debug output in stringified form
 */
export const getDebug: typeof mbs.getDebug = function getDebug() {
    if (settingsMBSLoaded()) {
        return JSON.stringify({
            log: logger,
            settings: Player.MBSSettings,
        }, jsonStringifier, 4);
    } else {
        return JSON.stringify({
            log: logger,
            settings: "ERROR: MBS not fully loaded yet",
        }, undefined, 4);
    }
};

// Register the debugger to FUSAM
waitFor(bcLoaded).then(() => {
    if (typeof FUSAM !== "undefined" && typeof FUSAM.registerDebugMethod === "function") {
        FUSAM.registerDebugMethod("mbs", getDebug);
    }
});
