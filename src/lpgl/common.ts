/**
 * A more readonly-friendly version of {@link Array.isArray}.
 * @param arg The to-be checked object
 * @returns Whether the passed object is an array
 */
export const isArray = Array.isArray as (arg: unknown) => arg is readonly unknown[];

/**
 * A version of {@link Object.keys} more aimed at records with literal string keys.
 * @param arg A record
 * @returns A list with all keys in the passed record
 */
export const keys = Object.keys as <KT extends string>(arg: Partial<Record<KT, unknown>>) => KT[];

/**
 * A version of {@link Object.entries} more aimed at records with literal string keys.
 * @param arg A record
 * @returns A list of 2-tuples with all key/value pairs in the passed record
 */
export const entries = Object.entries as <KT extends string, VT>(arg: Partial<Record<KT, VT>>) => [KT, VT][];

/**
 * A version of {@link Object.fromEntries} more aimed at records with literal string keys.
 * @param arg A list of 2-tuples
 * @returns A record constructed from the passed list
 */
export const fromEntries = Object.fromEntries as <KT extends string, VT>(arg: Iterable<readonly [KT, VT]>) => Record<KT, VT>;

/**
 * A version of {@link Array.includes} that serves as a type guard.
 * @param arg An array
 * @param value The element to search for
 * @returns Whether the passed array includes the passed value
 */
export function includes<T>(arg: readonly T[], value: unknown): value is T {
    return arg.includes(value as T);
}

/**
 * A version of {@link Number.isInteger} that serves as a type guard.
 * @param arg A numeric value
 * @returns Whether the passed numeric value is an integer
 */
export const isInteger = Number.isInteger as (arg: unknown) => arg is number;

type LogLevel = "debug" | "log" | "warn" | "error";

interface LogEntry {
    readonly date: Date,
    readonly level: LogLevel,
    readonly args: readonly unknown[],
}

/**
 * The MBS logging class.
 * Combines the {@link console} logging methods with an {@link Array} for storing the output.
 */
class MBSLog extends Array<LogEntry> {
    #log(level: LogLevel, args: readonly unknown[]) {
        const date = new Date(Date.now());
        console[level]("MBS:", ...args);
        this.push({ date, level, args });
    }

    /**
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/debug)
     * @param args Parameters to be passed to {@link console.debug}
     */
    debug(...args: unknown[]) {
        this.#log("debug", args);
    }

    /**
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/log)
     * @param args Parameters to be passed to {@link console.log}
     */
    log(...args: unknown[]) {
        this.#log("log", args);
    }

    /**
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/warn)
     * @param args Parameters to be passed to {@link console.warn}
     */
    warn(...args: unknown[]) {
        this.#log("warn", args);
    }

    /**
     * [MDN Reference](https://developer.mozilla.org/docs/Web/API/console/error)
     * @param args Parameters to be passed to {@link console.error}
     */
    error(...args: unknown[]) {
        this.#log("error", args);
    }
}

/** The MBS logger */
export const logger = new MBSLog();

/**
 * Wait for the passed predicate to evaluate to `true`.
 * @param predicate A predicate
 * @param timeout The timeout in milliseconds for when the predicate fails
 * @returns Whether the predicate has returned `true`
 */
export async function waitFor(predicate: () => boolean, timeout: number = 100): Promise<boolean> {
    while (!predicate()) {
        await new Promise(resolve => setTimeout(resolve, timeout));
    }
    return true;
}
