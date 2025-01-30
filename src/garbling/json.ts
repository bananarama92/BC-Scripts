import { logger } from "../common";

type PhoneticDict = Readonly<Record<string, undefined | string>>;
export type GagData = Readonly<Record<string, { readonly MUFFLE: number, readonly SOUND: string }>>;

/** A namespace for accessing garbling-related JSON data. */
class JSON {
    #phoneticDict: PhoneticDict = Object.freeze({});
    #gagData: Readonly<Partial<Record<string, GagData>>> = Object.freeze({});
    #phoneticDictInit = false;
    #gagDataInit = false;

    /** Get a record with gag-specific garbling data */
    get gagData() {
        if (!this.#gagDataInit) {
            this.#setField("gagData", "https://bananarama92.github.io/MBS/devel/vendor/gag_data.json");
        }
        return this.#gagData;
    }

    /** Get a record mapping English words to their phonetic equivalent. */
    get phoneticDict() {
        if (!this.#phoneticDictInit) {
            this.#setField("phoneticDict", "https://bananarama92.github.io/MBS/devel/vendor/en_US.json");
        }
        return this.#phoneticDict;
    }

    async #setField(type: "phoneticDict" | "gagData", url: string) {
        const data = await fetch(url).then(data => {
            if (data.ok) {
                logger.debug(`Successfully fetched '${type}' json`, data);
                return data.json() as Promise<Record<string, any>>;
            } else {
                logger.debug(`Failed to fetch '${type}' json`, data);
                return Promise.resolve(null);
            }
        }).catch(reason => {
            logger.error(reason);
            return null;
        });
        if (data === null) {
            return;
        }

        switch (type) {
            case "phoneticDict":
                this.#phoneticDict = Object.freeze(data);
                this.#phoneticDictInit = true;
                break;
            case "gagData":
                this.#gagData = Object.freeze(data);
                this.#gagDataInit = true;
                break;
            default:
                throw new Error(`Invalid type: ${type}`);
        }
    }

    /** Fetch the JSON files and initialize the caches. */
    init() {
        // Fire up the getters to fetch the JSON data
        this.gagData;
        this.phoneticDict;
    }
}

export const json = new JSON();
