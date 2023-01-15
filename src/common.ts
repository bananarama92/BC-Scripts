"use strict";

import bcModSdk from "bondage-club-mod-sdk";

/** An array with all alpha-numerical characters. */
const ALPHABET = Object.freeze([
    "A", "B", "C", "D",
    "E", "F", "G", "H",
    "I", "J", "K", "L",
    "M", "N", "O", "P",
    "Q", "R", "S", "T",
    "U", "V", "W", "X",
    "Y", "Z",
]);

/**
 * Return an object that produces a generator of integers from start (inclusive) to stop (exclusive) by step.
 * @param start - The starting value
 * @param stop - The maximum value
 * @param step - The step size
 */
export function* range(start: number, stop: number, step: number = 1): Generator<number, void, unknown> {
    if (typeof start !== "number") throw `Invalid "start" type: ${typeof start}`;
    if (typeof stop !== "number") throw `Invalid "stop" type: ${typeof stop}`;
    if (typeof step !== "number") throw `Invalid "step" type: ${typeof step}`;

    let i = start;
    while (i < stop) {
        yield i;
        i += step;
    }
}

/**
 * Return a random element from the passed list.
 * @param list The list in question
 * @returns The random element from the passed list
 */
export function randomElement<T>(list: readonly T[]): T {
    if (!Array.isArray(list)) {
        throw `Invalid "list" type: ${typeof list}`;
    } else if (list.length === 0) {
        throw 'Passed "list" must contain at least 1 item';
    }
    return list[Math.round(Math.random() * (list.length - 1))];
}

/**
 * Generate a password consisting of `n` random latin characters.
 * @param n The length of the password; must be in the [0, 8] interval
 * @returns the newly generated password
 */
export function getRandomPassword(n: number): string {
    if (n < 0 || n > 8) {
        throw `Invalid "n" value: ${typeof n}`;
    }

    let ret = "";
    for (const _ of range(0, n)) {
        ret += randomElement(ALPHABET);
    }
    return ret;
}

/**
 * Convert the passed BC version into a 2-tuple with the major- and beta-version
 * @param version The to-be parsed version
 * @returns A 2-tuple with the major- and beta version
 */
export function parseVersion(version: string): [number, number] {
    const match = GameVersionFormat.exec(version);
    if (match === null) {
        throw `Failed to match the passed version: ${version}`;
    }
    return [
        Number(match[2]),
        Number((match[3] === undefined) ? Infinity : match[4]),
    ];
}

/** Wait for the passed precidate to evaluate to `true`. */
export async function waitFor(predicate: () => boolean): Promise<boolean> {
    while (!predicate()) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return true;
}

/** Return a record with the BC versions of all players. */
export function getVersions(): Record<string, string> {
    const rec: Record<string, string> = {};
    Character.forEach((c) => {
        if (c.OnlineSharedSettings) {
            rec[c.Name] = c.OnlineSharedSettings.GameVersion;
        }
    });
    return rec;
}

/** The MBS version. */
export const MBS_VERSION = "0.1.15";

/** The MBS {@link ModSDKGlobalAPI} instance. */
export const MBS_MOD_API = bcModSdk.registerMod({
    name: "MBS",
    fullName: "Maid's Bondage Scripts",
    repository: "https://github.com/bananarama92/MBS",
    version: MBS_VERSION,
});
