import { clamp, pick, cloneDeepWith, zip } from "lodash-es";

import { logger, isArray, waitFor, fromEntries } from "../common";
import { bcLoaded } from "../common_bc";

import { validateColor } from "./common";

// Copy the windows convention as far as filename validation is concerned
export const FILE_REGEX = /[^\p{Cc}><:"/\\|?*]+/gu;
export const FILE_REGEX_INVERT = /[\p{Cc}><:"/\\|?*]+/gu;
export const FILE_SEP = "/";

let dummy: Character;
waitFor(bcLoaded).then(() => {
    dummy = CharacterLoadSimple("mbs-outfit-collection");
});

function toItemBundle(this: MBSItem) {
    return {
        Group: this.Asset.Group.Name,
        Name: this.Asset.Name,
        Difficulty: this.Difficulty,
        Color: this.Color,
        Property: this.Property,
        Craft: this.Craft,
    } satisfies ItemBundle;
}

export interface MBSItem extends Item {
    Color: string[],
    Difficulty: number,
    Property: ItemProperties,
    toJSON(): ItemBundle,
}

export interface ItemUpdate {
    color?: boolean,
    name?: boolean,
    layering?: boolean,
    description?: boolean,
    type?: boolean,
    property?: boolean,
    difficulty?: boolean,
}

export interface ItemCache {
    update: ItemUpdate,
    readonly outfit: Outfit;
    readonly item: MBSItem,
    readonly newItem: MBSItem,
    readonly asset: Asset,
    readonly group: AssetGroup,
    readonly updateCount: number,
    readonly element: HTMLDivElement;
    readonly readonly: boolean,
}

interface ProtoOutfit {
    name: string,
    outfit: Partial<Record<AssetGroupName, ItemBundle>>,
}

export type OutfitUpdate = "name" | "path" | "outfit" | "delete";

export interface Outfit extends Omit<ProtoOutfit, "outfit"> {
    path: readonly string[],
    readonly fullPath: string,
    readonly root: string,
    readonly id: number,
    readonly readonly: ReadonlySet<OutfitUpdate>,
    readonly outfit: Partial<Record<AssetGroupName, MBSItem>>,
}

export interface OutfitCache {
    newName?: string,
    newPath?: readonly string[],
    newOutfit?: Partial<Record<AssetGroupName, ItemCache>>,
    deleteOutfit?: boolean,
    readonly outfit: Outfit,
    readonly update: Set<OutfitUpdate>,
    readonly updateCount: number,
    readonly element: HTMLDivElement;
    readonly readonly: ReadonlySet<OutfitUpdate>,
}

export interface DirectoryCache {
    newName?: string,
    deleteDirectory?: boolean;
    readonly element: HTMLDivElement;
    readonly update: Set<"delete" | "name">,
    readonly updateCount: number,
}

class DirMap extends Map<string, DirMap> {
    readonly files: Map<number, Outfit>;

    constructor(
        iterable: null | Iterable<readonly [string, DirMap]> = null,
        files: null | Map<number, Outfit> = null,
    ) {
        super(iterable);
        this.files = files ?? new Map();
    }

    overlay(other: DirMap): DirMap {
        for (const [k, v] of other) {
            const childMap = this.get(k);
            if (!childMap) {
                this.set(k, v);
            } else {
                childMap.overlay(v);
            }
        }
        for (const [k, v] of other.files) {
            this.files.set(k, v);
        }
        return this;
    }
}

type ApplyCacheOptions = {
    readonly push?: boolean;
    readonly cancel?: boolean;
    readonly resetItem?: null | ItemCache;
    readonly resetOutfit?: null | OutfitCache;
}

type JSONOptions = {
    readonly paths?: readonly (readonly string[])[];
    readonly omitID?: number[];
}

export class OutfitCollection {
    readonly outfitsFlat: Map<number, Outfit>;
    readonly cache: Map<number, OutfitCache>;
    readonly outfitsNested: DirMap;
    idMax: number = 0;

    static get localStoragePrefix(): `mbs-outfit-collection-${number}` {
        return `mbs-outfit-collection-${Player.MemberNumber ?? NaN}`;
    }
    get localStoragePrefix() {
        return (this.constructor as typeof OutfitCollection).localStoragePrefix;
    }

    constructor(data: Outfit[]) {
        this.idMax = Math.max(...data.map(i => i.id));
        this.outfitsFlat = new Map(data.map(i => [i.id, i]));
        this.cache = new Map();
        this.outfitsNested = new DirMap();
        for (const outfit of this.outfitsFlat.values()) {
            this.#setPath(outfit.path, outfit);
        }
    }

    static sortData(outfits: Outfit[]) {
        return outfits.sort((outfit1, outfit2) => {
            const ziterator = zip(
                [outfit1.root, ...outfit1.path, outfit1.name],
                [outfit2.root, ...outfit2.path, outfit2.name],
            );
            for (const [i, j] of ziterator) {
                if (i === undefined) {
                    return -1;
                } else if (j === undefined) {
                    return 1;
                }

                const equivalency = i.localeCompare(j);
                if (equivalency) {
                    return equivalency;
                }
            }
            return 0;
        });
    }

    #parseCacheOptions(options?: null | ApplyCacheOptions): Required<ApplyCacheOptions> {
        const { push, cancel, resetItem, resetOutfit } = options ?? {};
        return {
            push: push ?? true,
            cancel: cancel ?? false,
            resetItem: resetItem ?? null,
            resetOutfit: resetOutfit ?? null,
        };
    }

    async applyItemCache(itemCache: ItemCache, options: null | ApplyCacheOptions = null) {
        this.#applyItemCache(itemCache, this.#parseCacheOptions(options));
    }

    #applyItemCache(itemCache: ItemCache, options: Required<ApplyCacheOptions>) {
        const { cancel, push, resetItem } = options;
        if (itemCache.updateCount && !itemCache.readonly) {
            if (!cancel) {
                Object.assign(itemCache.item, itemCache.newItem);
            }

            if (push) {
                this.push({ paths: [itemCache.outfit.path] });
            }

            if (itemCache === resetItem) {
                Object.assign(
                    itemCache.newItem,
                    cloneDeepWith(itemCache.item, (value, key) => key === "Asset" ? value as Asset : undefined),
                );
                itemCache.update = {};
            }
        }
    }

    async applyOutfitCache(outfitCache: OutfitCache, options: null | ApplyCacheOptions = null) {
        this.#applyOutfitCache(outfitCache, this.#parseCacheOptions(options));
    }

    #applyOutfitCache(outfitCache: OutfitCache, options: Required<ApplyCacheOptions>) {
        const ret: Set<OutfitUpdate> = new Set();
        const { outfit, newOutfit, newName, newPath, deleteOutfit, readonly, update } = outfitCache;

        const doDelete = !options.cancel && deleteOutfit && !readonly.has("delete");
        if (doDelete) {
            this.delete(outfit);
            ret.add("delete");
        } else {
            // Delegate the `cancel` handling to `applyItemCache()`
            if (newOutfit && !readonly.has("outfit")) {
                const optionsItem = { ...options, push: false };
                for (const itemCache of Object.values(newOutfit)) {
                    this.#applyItemCache(itemCache, optionsItem);
                }
                if (!options.cancel) {
                    ret.add("outfit");
                }
            }

            if (!options.cancel) {
                if (newName && !readonly.has("name")) {
                    outfit.name = newName;
                    ret.add("name");
                }

                if (newPath && !readonly.has("path")) {
                    this.move(outfit.path, newPath, outfit.id);
                    outfit.path = newPath;
                    ret.add("path");
                }
            }
        }

        if (options.push) {
            this.push({
                paths: [outfit.path],
                omitID: doDelete ? [outfit.id] : undefined,
            });
        }

        if (options.resetOutfit === outfitCache) {
            delete outfitCache.newOutfit;
            delete outfitCache.newName;
            delete outfitCache.newPath;
            delete outfitCache.deleteOutfit;
            update.clear();
        }

        return ret;
    }

    async applyCache(options: null | ApplyCacheOptions = null) {
        this.#applyCache(this.#parseCacheOptions(options));
    }

    #applyCache(options: Required<ApplyCacheOptions>) {
        const optionsOutfit = { ...options, push: false };
        const outfits = Array.from(this.cache.values()).map(outfitCache => {
            const status = this.#applyOutfitCache(outfitCache, optionsOutfit);
            return { status, outfit: outfitCache.outfit };
        });

        if (options.push) {
            const paths = Object.fromEntries(outfits.map(({ outfit }) => [outfit.fullPath, outfit.path]));
            this.push({
                paths: Object.values(paths),
                omitID: outfits.filter(i => i.status.has("delete")).map(i => i.outfit.id),
            });
        }

        this.cache.clear();
    }

    push(options: null | JSONOptions = null) {
        if (Player.MemberNumber === undefined) {
            throw new Error();
        }

        const jsonRecord = this.toJSON(options);
        for (const [key, value] of Object.entries(jsonRecord)) {
            localStorage.setItem(`${this.localStoragePrefix}${key}`, JSON.stringify(value));
        }
    }

    delete(outfit: Outfit) {
        if (outfit.readonly) {
            return false;
        }

        this.cache.delete(outfit.id);
        this.#deletePath(outfit.path, outfit.id);
        return this.outfitsFlat.delete(outfit.id);
    }

    set(outfit: Omit<Outfit, "id">) {
        this.idMax++;
        const newOutfit = Object.assign(outfit, { id: this.idMax });
        this.#setPath(newOutfit.path, newOutfit);
        return this.outfitsFlat.set(newOutfit.id, newOutfit);
    }

    get(path: readonly string[], id?: null): undefined | DirMap;
    get(path: readonly string[], id: number): undefined | Outfit;
    get(path: readonly string[], id: null | number): undefined | DirMap | Outfit;

    get(path: readonly string[], id: null | number = null): undefined | DirMap | Outfit {
        const dirMap = path.reduce((map: undefined | DirMap, p) => map?.get(p), this.outfitsNested);
        return (id == null || dirMap == null) ? dirMap : dirMap.files.get(id);
    }

    move(pathOld: readonly string[], pathNew: readonly string[], id: null | number = null) {
        const obj = this.get(pathOld, id);
        if (obj === undefined) {
            return undefined;
        }

        this.#deletePath(pathOld, id);
        this.#setPath(pathNew, obj);
    }

    #deletePath(path: readonly string[], id: null | number = null) {
        if (path.length === 0) {
            return false;
        }

        if (id == null) {
            const head = path.slice(0, -1);
            const tail = path.at(-1) as string;
            const pathMap = head.reduce((map: undefined | DirMap, p) => map?.get(p), this.outfitsNested);
            return pathMap?.delete(tail) ?? false;
        } else {
            const pathMap = path.reduce((map: undefined | DirMap, p) => map?.get(p), this.outfitsNested);
            return pathMap ? pathMap.files.delete(id) : false;
        }
    }

    #setPath(path: readonly string[], obj: Outfit | DirMap) {
        const dirMap = path.reduce((map, p) => {
            let ret = map.get(p);
            if (ret) {
                return ret;
            } else {
                ret = new DirMap();
                map.set(p, ret);
                return ret;
            }
        }, this.outfitsNested);

        if (obj instanceof Map) {
            dirMap.overlay(obj);
        } else {
            dirMap.files.set(obj.id, obj);
        }
    }

    toJSON(options: null | JSONOptions = null) {
        options ??= {};
        let outfits: Outfit[] = [];

        if (options.paths) {
            outfits = options.paths.flatMap(path => {
                const dirMap = this.get(path);
                const outfitList = dirMap ? dirMap.files.values() : [];
                return Array.from(outfitList);
            });
        } else {
            outfits = Array.from(this.outfitsFlat.values());
        }

        if (options.omitID?.length) {
            const omitID = new Set(options.omitID);
            outfits = outfits.filter(i => !omitID.has(i.id));
        }

        const ret: Record<string, Pick<Outfit, "name" | "outfit">[]> = {};
        for (const outfit of OutfitCollection.sortData(outfits)) {
            ret[outfit.fullPath] ??= [];
            ret[outfit.fullPath].push(pick(outfit, "name", "outfit"));
        }
        return ret;
    }

    static fromLocalStorage() {
        if (Player.MemberNumber === undefined) {
            throw new Error();
        }

        const jsonEntries: Record<string, string> = {};
        const prefix = OutfitCollection.localStoragePrefix;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                jsonEntries[key.slice(prefix.length)] = localStorage.getItem(key) as string;
            }
        }
        const collection = OutfitCollection.fromJSON(jsonEntries);
        return collection ?? new OutfitCollection([]);
    }

    static fromJSON(values: Record<string, string>): null | OutfitCollection {
        const protoOutfit: Record<string, ProtoOutfit[]> = {};
        let list: ProtoOutfit[];
        for (const [path, jsonString] of Object.entries(values)) {
            try {
                list = JSON.parse(jsonString);
            } catch (ex) {
                logger.error(`Failed to parse the "${path}" string data`, ex);
                continue;
            }
            if (!isArray(list)) {
                continue;
            }
            protoOutfit[path] = list;
        }
        return new OutfitCollection(OutfitCollection.parseProtoOutfit(protoOutfit));
    }

    static parseProtoOutfit(protoOutfits: Record<string, readonly ProtoOutfit[]>, idStart: number = 0): Outfit[] {
        const ret: Outfit[] = [];
        for (const [stringPath, outfits] of Object.entries(protoOutfits)) {
            const path = stringPath.split(FILE_SEP).map(i => i.replace(FILE_REGEX_INVERT, "")).filter(Boolean);
            ret.push(
                ...outfits.map((outfit, i) => {
                    if (!CommonIsObject(outfit)) {
                        return null;
                    } else if (typeof outfit.name !== "string") {
                        return null;
                    } else if (!CommonIsObject(outfit.outfit)) {
                        return null;
                    }

                    const name = outfit.name.replace(FILE_REGEX_INVERT, "");
                    const readonly: ReadonlySet<OutfitUpdate> = new Set();
                    const ret: Outfit = {
                        id: idStart + i,
                        readonly,
                        name,
                        path,
                        root: "mbs-outfits",
                        get fullPath() {
                            return `${FILE_SEP}${this.path.join(FILE_SEP)}`;
                        },
                        outfit: !CommonIsObject(outfit.outfit) ? {} : fromEntries(Object.values(outfit.outfit).map(item => {
                            if (!CommonIsObject(item)) {
                                return;
                            }

                            const asset = AssetGet("Female3DCG", item.Group, item.Name);
                            if (asset == null) {
                                return;
                            }

                            const color = validateColor(asset, item.Color);

                            let craft: undefined | CraftingItem;
                            if (!CommonIsObject(item.Craft)) {
                                craft = undefined;
                            } else {
                                const status = CraftingValidate(item.Craft, asset, false);
                                craft = status === CraftingStatusType.CRITICAL_ERROR ? undefined : item.Craft;
                            }

                            let difficulty: undefined | number;
                            if (
                                !asset.AllowTighten
                                || typeof item.Difficulty !== "number"
                                || !Number.isFinite(item.Difficulty)
                            ) {
                                difficulty = asset.Difficulty;
                            } else {
                                const maxDifficulty = 10 + 4 + asset.Difficulty + (craft?.Property === "Secure" ? 4 : 0);
                                difficulty = clamp(
                                    Math.round(item.Difficulty),
                                    -10,
                                    maxDifficulty,
                                );
                            }

                            let property: ItemProperties = {};
                            if (CommonIsObject(item.Property)) {
                                const testItem = { Asset: asset, Property: item.Property };
                                ExtendedItemInit(dummy, testItem, false, false);
                                property = item.Property;
                            }

                            const bundleSanitized: Omit<MBSItem, "toJSON"> = {
                                Asset: asset,
                                Difficulty: difficulty,
                                Color: color,
                                Craft: craft,
                                Property: property,
                            };
                            Object.defineProperty(
                                bundleSanitized,
                                "toJSON",
                                {
                                    value: toItemBundle.bind(bundleSanitized as MBSItem),
                                    writable: false,
                                    enumerable: false,
                                    configurable: false,
                                },
                            );
                            return [asset.Group.Name, bundleSanitized as MBSItem];
                        }).filter((i): i is [AssetGroupName, MBSItem] => i != null)),
                    };
                    return ret;
                }).filter((i): i is Outfit => {
                    return i != null;
                }),
            );
        }
        return OutfitCollection.sortData(ret);
    }

    static fromBase64(name: string, str: string): null | OutfitCollection {
        let bundle: ItemBundle[];
        if (typeof str !== "string") {
            return null;
        }

        try {
            const decompress = LZString.decompressFromBase64(str);
            if (!decompress) {
                return null;
            }
            bundle = JSON.parse(decompress);
        } catch (ex) {
            logger.error("Failed to parse the string data", ex);
            return null;
        }

        if (!isArray(bundle)) {
            return null;
        }

        return new OutfitCollection(OutfitCollection.parseProtoOutfit({
            ["/foo/bar/baz"]: [{
                name,
                outfit: fromEntries(bundle.map(item => [item.Group, item])),
            }],
        }));
    }
}
