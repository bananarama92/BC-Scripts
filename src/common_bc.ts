/** Miscellaneous common BC-related functions and classes */

import { sortBy, omit, clamp, sample } from "lodash-es";

import {
    toStringTemplate,
    LoopIterator,
    generateIDs,
    BCX_MOD_API,
    includes,
    isArray,
    logger,
} from "./common";
import { pushMBSSettings, SettingsType } from "./settings";
import {
    DEFAULT_FLAGS,
    parseLegacyFlags,
    fromItemBundles,
    fortuneWheelEquip,
    StripLevel,
    getStripCondition,
    fortuneItemsSort,
    getFlagDescription,
} from "./fortune_wheel";
import { validateHooks, wheelHookRegister } from "./fortune_wheel/events";

/** The maximum number of IDs within an item set category (builtin, MBS default, MBS custom) */
const ITEM_SET_CATEGORY_ID_RANGE = 256; // 2**8

/** The maximum number of IDs for an item set. */
const ITEM_SET_FLAG_COUNT = 16; // 2**4

/** The maximum number of custom user-specified wheel of fortune item sets. */
export const MBS_MAX_SETS = 32;

/** The maximum number of custom wheel of fortune ID presets. */
export const MBS_MAX_ID_SETS = 8;

/** A list of all valid wheel of fortune colors. */
export const FORTUNE_WHEEL_COLORS: readonly FortuneWheelColor[] = Object.freeze([
    "Blue",
    "Gold",
    "Gray",
    "Green",
    "Orange",
    "Purple",
    "Red",
    "Yellow",
]);

/**
 * Test whether the passed object is a player- or simple character and raise otherwise.
 * @param character The character in question
 */
export function validateCharacter(character: Character): void {
    if (character === null || typeof character !== "object") {
        throw new TypeError(`Invalid "character" type: ${typeof character}`);
    } else if (!character.IsSimple() && !character.IsPlayer()) {
        throw new Error("Expected a simple or player character");
    }
}

/**
 * Check whether cosplay items can be changed on the given character, including support for the BCX `alt_allow_changing_appearance` rule.
 * @param character The character in question
 * @returns whether cosplay items can be changed or not
 */
export function canChangeCosplay(character: Character): boolean {
    const cosplayBlocked = character.OnlineSharedSettings?.BlockBodyCosplay ?? true;
    if (!cosplayBlocked) {
        return true;
    }

    const ruleState = BCX_MOD_API.getRuleState("alt_allow_changing_appearance");
    if (ruleState === null || !character.IsPlayer()) {
        return false;
    }

    // Allow cosplay changes as long as the minimum role isn't set to lover or above
    return (
        ruleState.inEffect
        && ruleState.isEnforced
        && <number>ruleState.customData.minimumRole > 3
    );
}

/**
 * Filter the passed ID string, ensuring that only IDs defined in {@link WheelFortuneOption} are present.
 * Note that the relative order of substrings is not guaranteed to be preserved.
 * @param IDs A string of wheel of fortune IDs
 */
export function sanitizeWheelFortuneIDs(IDs: string): string {
    if (typeof IDs !== "string") {
        throw new TypeError(`Invalid "IDs" type: ${typeof IDs}`);
    }
    let ret = "";
    for (const option of WheelFortuneOption) {
        if (IDs.includes(option.ID)) {
            ret += option.ID;
        }
    }
    return ret;
}

/**
 * Return Whether BC had been loaded.
 * @param testGameVersion Whether the game version should be validated or not
 */
export function bcLoaded(testGameVersion=true): boolean {
    // `GameStart()` should be (nearly) fully initialized at this point
    return (
        typeof ServerSocket === "object"
        && ServerSocket !== null
        && (testGameVersion ? GameVersionFormat.test(GameVersion) : true)
    );
}

/** Return whether all vanilla BC online shared settings are loaded. */
export function settingsLoaded(): boolean {
    return bcLoaded() && Player.OnlineSharedSettings !== undefined;
}

/** Return whether all online settings (including MBS ones) are loaded. */
export function settingsMBSLoaded(): boolean {
    return settingsLoaded() && Player.MBSSettings !== undefined;
}

/** Indices of the default MBS wheel of fortune item sets */
const DEFAULT_ITEM_SET_INDEX: Record<string, number> = Object.freeze({
    "PSO Bondage": 0,
    "Mummification": 1,
    "Bondage Maid": 2,
    "Petrification": 3,
});

export abstract class MBSSelectedObject<T extends { name?: string }> {
    /** The name of custom option */
    name: null | string = null;
    /** A read-only view of the underlying list of wheel objects */
    readonly mbsList: readonly (null | T)[];
    /** The weight of a particular option within the wheel of fortune */
    weight: number;

    constructor(mbsList: readonly (null | T)[], weight?: number) {
        this.mbsList = mbsList;
        this.weight = Number.isInteger(weight) ? clamp(<number>weight, 1, 9) : 1;
    }

    /** Reset all currently select options to their default. */
    reset(): void {
        this.name = null;
        this.weight = 1;
    }

    /**
     * Return whether the {@link FWSelectedItemSet.name} and any other attributes are valid.
     * @param selectedIndex The index of the currently opened {@link FWItemSet} (if any)
     */
    isValid(selectedIndex: null | number = null): this is ThisType<this> & { name: string } {
        if (!this.name) {
            return false;
        }
        return this.mbsList.every((value, i) => {
            if (i === selectedIndex) {
                return true;
            } else {
                return value?.name !== this.name;
            }
        });
    }

    /**
     * Update this instance with settings from the provided wheel of fortune object.
     * @param value The to-be read wheel of fortune object
     */
    abstract readSettings(value: T): void;

    /** Construct a new wheel of fortune object. */
    abstract writeSettings(): T;

    /** Return a string representation of this instance. */
    toString(): string {
        return toStringTemplate(typeof this, this.toJSON());
    }

    /** Return an object representation of this instance. */
    abstract toJSON(): object;
}

export class FWSelectedItemSet extends MBSSelectedObject<FWItemSet> {
    /** The to-be equipped items */
    itemList: null | readonly FWItem[] = null;
    /** Which flavors of {@link FWItemSetOption} should be created */
    readonly flags: readonly FWFlag[] = Object.freeze(DEFAULT_FLAGS.map(i => Object.seal({ ...i })));
    /** The cached base64 outfit code */
    outfitCache: null | string = null;
    readonly activeHooks: Map<string, FWSelectedHook>;

    /** An (infinite) iterator with all available {@link this.stripLevel} values */
    readonly stripIter: LoopIterator<StripLevel>;
    /** Get or set which items should be removed from the user */
    get stripLevel(): StripLevel { return this.stripIter.value; }
    set stripLevel(level: StripLevel) {
        const index = this.stripIter.list.indexOf(level);
        this.stripIter.setPosition(index);
    }

    /** An (infinite) iterator with all available {@link this.equipLevel} values */
    readonly equipIter: LoopIterator<StripLevel>;
    /** Which from the to-be equipped outfit should be actually equipped */
    get equipLevel(): StripLevel { return this.equipIter.value; }
    set equipLevel(level: StripLevel) {
        const index = this.equipIter.list.indexOf(level);
        this.equipIter.setPosition(index);
    }

    constructor(wheelList: readonly (null | FWItemSet)[], weight?: number) {
        super(wheelList, weight);
        this.stripIter = new LoopIterator([StripLevel.NONE, StripLevel.CLOTHES, StripLevel.UNDERWEAR, StripLevel.COSPLAY], StripLevel.UNDERWEAR);
        this.equipIter = new LoopIterator([StripLevel.NONE, StripLevel.CLOTHES, StripLevel.UNDERWEAR, StripLevel.COSPLAY], StripLevel.UNDERWEAR);
        this.activeHooks = new Map;
    }

    /** Reset all currently select options to their default. */
    reset(): void {
        super.reset();
        this.itemList = null;
        this.outfitCache = null;
        this.stripLevel = StripLevel.UNDERWEAR;
        this.equipLevel = StripLevel.UNDERWEAR;
        this.activeHooks.clear();
        DEFAULT_FLAGS.forEach((flag, i) => Object.assign(this.flags[i], flag));
    }

    /**
     * Update this instance with settings from the provided item set.
     * @param itemSet The to-be read wheel of fortune item set
     */
    readSettings(itemSet: FWItemSet): void {
        if (!(itemSet instanceof FWItemSet)) {
            throw new TypeError(`Invalid "ItemSet" type: ${typeof itemSet}`);
        }
        this.name = itemSet.name;
        this.itemList = itemSet.itemList;
        this.stripLevel = itemSet.stripLevel;
        this.equipLevel = itemSet.equipLevel;
        this.outfitCache = null;
        this.weight = itemSet.weight;
        this.activeHooks.clear();
        for (const [name, hook] of Object.entries(itemSet.activeHooks)) {
            this.activeHooks.set(
                name,
                { ...hook, kwargs: new Map(Object.entries(hook.kwargs)) },
            );
        }
        itemSet.flags.forEach((flag, i) => Object.assign(this.flags[i], flag));
    }

    /**
     * Update this instance with settings from the provided item set.
     */
    writeSettings(): FWItemSet {
        if (this.name === null || this.itemList === null) {
            throw new Error("Cannot create an ItemSet while \"name\" or \"itemList\" is null");
        }

        const hooks: Record<string, FWHook> = {};
        for (const [name, hook] of this.activeHooks) {
            hooks[name] = {
                ...hook,
                kwargs: Object.fromEntries(hook.kwargs),
                get kwargsConfig() {
                    return wheelHookRegister.get(this.modName, this.hookType, this.hookName)?.kwargs ?? {};
                },
            };
        }

        return new FWItemSet(
            this.name,
            this.itemList,
            this.mbsList,
            this.stripLevel,
            this.equipLevel,
            this.flags,
            true,
            this.weight,
            hooks,
        );
    }

    /**
     * Convert a base64-serialized {@link Item} array into a wheel of fortune item list.
     * @returns Whether the loading was successful
     */
    loadFromBase64(): boolean {
        if (this.outfitCache === null) {
            return false;
        }

        let items: ItemBundle | ItemBundle[];
        let itemList: FWItem[];
        try {
            items = JSON.parse(<string>LZString.decompressFromBase64(this.outfitCache.trim()));
            itemList = fromItemBundles(items);
        } catch (ex) {
            logger.warn("Failed to parse outfit code:", ex);
            return false;
        }

        if (itemList.length === 0) {
            return false;
        }
        this.itemList = Object.freeze(fortuneItemsSort(itemList));
        return true;
    }

    /**
     * Return whether the {@link FWSelectedItemSet.name} and any other attributes are valid.
     * @param selectedIndex The index of the currently opened {@link FWItemSet} (if any)
     */
    isValid(selectedIndex: null | number = null): this is ThisType<this> & { name: string, itemList: readonly FWItem[] } {
        return (
            super.isValid(selectedIndex)
            && this.itemList !== null
            && this.flags.some(i => i.enabled)
        );
    }

    /** Return an object representation of this instance. */
    toJSON() {
        const activeHooks: Record<string, FWJsonHook> = {};
        for (const [name, hook] of this.activeHooks) {
            const kwargs: FWJsonHook["kwargs"] = {};
            for (const [kwargName, kwarg] of hook.kwargs) {
                switch (kwarg.type) {
                    case "select-multiple":
                        kwargs[kwargName] = { ...kwarg, value: Array.from(kwarg.value) };
                        break;
                    default:
                        kwargs[kwargName] = kwarg;
                }
            }
            activeHooks[name] = { ...hook, kwargs };
        }

        return {
            name: this.name,
            itemList: this.itemList,
            stripLevel: this.stripLevel,
            equipLevel: this.equipLevel,
            flags: this.flags,
            outfitCache: this.outfitCache,
            activeHooks,
        };
    }
}

export class FWSelectedCommand extends MBSSelectedObject<FWCommand> {
    /**
     * Update this instance with settings from the provided command.
     * @param command The to-be read wheel of fortune command
     */
    readSettings(command: FWCommand): void {
        if (!(command instanceof FWCommand)) {
            throw new TypeError(`Invalid "command" type: ${typeof command}`);
        }
        this.name = command.name;
        this.weight = command.weight;
    }

    /**
     * Construct a new wheel of fortune command.
     */
    writeSettings(): FWCommand {
        if (this.name === null) {
            throw new Error("Cannot create a Command while \"name\" is null");
        }
        return new FWCommand(this.name, this.mbsList, this.weight);
    }

    /** Return an object representation of this instance. */
    toJSON() {
        return {
            name: this.name,
        };
    }
}

/** A base class for MBS-related objects. */
export abstract class MBSObject<OptionType extends Record<string, any>> {
    /** The name of custom option */
    readonly name: string;
    /** Whether this concerns a custom user-created item set */
    readonly custom: boolean;
    /** The registered options corresponding to this item set (if any) */
    #children: null | readonly OptionType[] = null;
    /** A readonly view of the character's list of wheel objects */
    readonly mbsList: readonly (null | MBSObject<OptionType>)[];
    /** The weight of a particular option within the wheel of fortune */
    readonly weight: number;

    /** Get the registered options corresponding to this item set (if any) */
    get children(): null | readonly OptionType[] { return this.#children; }

    /** Get the index of this instance within the player's fortune wheel sets and -1 if it's absent. */
    get index(): number {
        return this.mbsList.findIndex(i => i === this);
    }

    constructor(
        name: string,
        custom: boolean,
        wheelList: readonly (null | MBSObject<OptionType>)[],
        weight: number,
    ) {
        this.name = name;
        this.custom = custom;
        this.mbsList = wheelList;
        this.weight = weight;
    }

    /**
     * Validation function for the classes' constructor
     * @param kwargs The to-be validated arguments
     */
    static validate(_: object): object {
        throw new Error("Trying to call an abstract method");
    }

    /**
     * Construct a new {@link FWObject} instance from the passed object
     * @param kwargs The to-be parsed object
     */
    static fromObject(..._: any): FWObject<FWObjectOption> {
        throw new Error("Trying to call an abstract method");
    }

    /**
     * Convert this instance into a list of {@link FWItemSetOption}.
     * @returns A list of wheel of fortune options
     */
    abstract toOptions(): OptionType[];

    /**
     * Convert this instance into a list of {@link FWItemSetOption} and
     * register {@link WheelFortuneOption} and (optionally) {@link WheelFortuneDefault}.
     */
    register(): void {
        this.#children = this.toOptions();
    }

    /**
     * Unregister this instance from {@link WheelFortuneOption} and {@link WheelFortuneDefault}.
     */
    unregister(): void {
        this.#children = null;
    }

    /** Return a string representation of this instance. */
    toString(): string {
        return toStringTemplate(typeof this, this.toJSON());
    }

    /** Return a (JSON safe-ish) object representation of this instance. */
    abstract toJSON(): Record<string, any>;
}

/** A base class for fortune wheel sets. */
export abstract class FWObject<OptionType extends FWObjectOption> extends MBSObject<OptionType> {
    /**
     * Convert this instance into a list of {@link FWItemSetOption}.
     * @returns A list of wheel of fortune options
     */
    abstract toOptions(): OptionType[];

    /** Find the insertion position within `WheelFortuneOption`. */
    #registerFindStart(): number {
        if (!this.children?.length) {
            return WheelFortuneOption.length;
        } else {
            const initialID = this.children[0].ID;
            const start = WheelFortuneOption.findIndex(i => i.ID >= initialID);
            return start === -1 ? WheelFortuneOption.length : start;
        }
    }

    /**
     * Convert this instance into a list of {@link FWItemSetOption} and
     * register {@link WheelFortuneOption} and (optionally) {@link WheelFortuneDefault}.
     * @param push Whether the new MBS settings should be pushed to the server
     */
    register(push: boolean = true): void {
        super.register();
        let start = this.#registerFindStart();
        for (const o of <readonly OptionType[]>this.children) {
            // Check whether the option is already registered
            const i = WheelFortuneOption.findIndex(prevOption => prevOption.ID === o.ID);

            // Either replace or add a new option
            if (i !== -1) {
                WheelFortuneOption[i] = o;
                if (o.Default && !WheelFortuneDefault.includes(o.ID)) {
                    WheelFortuneDefault += o.ID;
                }
            } else {
                WheelFortuneOption.splice(start, 0, o);
                if (o.Default) {
                    WheelFortuneDefault += o.ID;
                }
            }
            start += 1;
        }
        if (push) {
            pushMBSSettings([SettingsType.SHARED]);
        }
    }

    /**
     * Unregister this instance from {@link WheelFortuneOption} and {@link WheelFortuneDefault}.
     * @param push Whether the new MBS settings should be pushed to the server
     */
    unregister(push: boolean = true): void {
        const IDs = this.children?.map(c => c.ID) ?? [];
        super.unregister();
        WheelFortuneOption = WheelFortuneOption.filter(i => !IDs.includes(i.ID));
        WheelFortuneDefault = Array.from(WheelFortuneDefault).filter(i => !IDs.includes(i)).join("");

        if (push) {
            pushMBSSettings([SettingsType.SHARED]);
        }
    }

    /** Return a list of wheel of fortune IDs in the form of length-1 strings */
    abstract getIDs(): string[];
}

/** {@link FWItemSet} constructor argument types in tuple form */
type FWItemSetArgTypes = ConstructorParameters<typeof FWItemSet>;

/** {@link FWItemSet} constructor argument types in object form */
type FWItemSetKwargTypes = {
    name: string,
    itemList: readonly FWItem[],
    mbsList: readonly (null | FWItemSet)[],
    stripLevel?: StripLevel,
    equipLevel?: StripLevel,
    flags?: readonly Readonly<FWFlag>[],
    custom?: boolean,
    weight?: number,
    activeHooks?: Readonly<Record<string, FWHook | FWJsonHook>>,
};

function validateFlags(flags: readonly Readonly<FWFlag>[]): FWFlag[] {
    return DEFAULT_FLAGS.map((ref_flag, i) => {
        const flag = flags[i];
        if (flag === null || typeof flag !== "object" || flag.type !== ref_flag.type) {
            return { ...ref_flag };
        }

        const enabled = typeof flag.enabled === "boolean" ? flag.enabled : ref_flag.enabled;
        switch (flag.type) {
            case "TimerPasswordPadlock":
                if (!(Number.isInteger(flag.time) && flag.time >= 1 && flag.time <= (24 * 60 * 60))) {
                    return { ...ref_flag };
                }
                return { type: flag.type, description: ref_flag.description, time: flag.time, enabled };
            case "ExclusivePadlock":
            case "HighSecurityPadlock":
            case null:
                return { type: flag.type, description: ref_flag.description, enabled };
            default:
                return { ...ref_flag };
        }
    });
}

/** A class for storing custom user-specified wheel of fortune item sets. */
export class FWItemSet extends FWObject<FWItemSetOption> implements Omit<FWSimpleItemSet, "flags" | "activeHooks"> {
    /** The to-be equipped items */
    readonly itemList: readonly FWItem[];
    /** Which items should be removed from the user */
    readonly stripLevel: StripLevel;
    /** Which from the to-be equipped outfit should be actually equipped */
    readonly equipLevel: StripLevel;
    /** Which flavors of {@link FWItemSetOption} should be created */
    readonly flags: readonly Readonly<FWFlag>[];
    // @ts-ignore: false positive; narrowing of superclass attribute type
    readonly mbsList: readonly (null | FWItemSet)[];
    readonly activeHooks: Readonly<Record<string, FWHook>>;

    /** Initialize the instance */
    constructor(
        name: string,
        itemList: readonly FWItem[],
        mbsList: readonly (null | FWItemSet)[],
        stripLevel?: StripLevel,
        equipLevel?: StripLevel,
        flags?: readonly Readonly<FWFlag>[],
        custom?: boolean,
        weight?: number,
        activeHooks?: Readonly<Record<string, FWHook | FWJsonHook>>,
    ) {
        const kwargs = FWItemSet.validate({
            name,
            itemList,
            mbsList,
            stripLevel,
            equipLevel,
            flags,
            custom,
            weight,
            activeHooks,
        });
        super(kwargs.name, kwargs.custom, kwargs.mbsList, kwargs.weight);
        this.itemList = kwargs.itemList;
        this.stripLevel = kwargs.stripLevel;
        this.equipLevel = kwargs.equipLevel;
        this.flags = kwargs.flags;
        this.activeHooks = kwargs.activeHooks as Readonly<Record<string, FWHook>>;
    }

    /** Validation function for the classes' constructor */
    static validate(kwargs: FWItemSetKwargTypes): Required<FWItemSetKwargTypes> {
        if (typeof kwargs.name !== "string") {
            throw new TypeError(`Invalid "name" type: ${typeof kwargs.name}`);
        }

        if (isArray(kwargs.itemList)) {
            const itemList: FWItem[] = [];
            const invalid: string[] = [];
            for (let item of kwargs.itemList) {
                const asset = AssetGet("Female3DCG", item.Group, item.Name);
                if (asset == null) {
                    invalid.push(`${item.Group}:${item.Name}`);
                    continue;
                } else if (!(
                    asset.Group.IsItem()
                    || (asset.Group.IsAppearance() && asset.Group.AllowNone)
                )) {
                    continue;
                }

                if (!item.TypeRecord && item.Type !== undefined) {
                    item = Object.freeze({
                        ...omit(item, "Type"),
                        TypeRecord: ExtendedItemTypeToRecord(asset, item.Type),
                    });
                }
                itemList.push(item);
            }
            kwargs.itemList = Object.freeze(itemList);
            if (invalid.length !== 0) {
                logger.warn(`Found ${invalid.length} items in wheel of fortune item set "${this.name}": ${invalid}`);
            }
        } else {
            throw new TypeError(`Invalid "itemList" type: ${typeof kwargs.itemList}`);
        }

        if (!isArray(kwargs.mbsList)) {
            throw new TypeError(`Invalid "mbsList" type: ${typeof kwargs.mbsList}`);
        }

        if (!(includes(Object.values(StripLevel), kwargs.stripLevel))) {
            kwargs.stripLevel = StripLevel.UNDERWEAR;
        }

        if (!(includes(Object.values(StripLevel), kwargs.equipLevel))) {
            kwargs.stripLevel = StripLevel.UNDERWEAR;
        }

        if (isArray(kwargs.flags)) {
            let flags: FWFlag[];
            if (kwargs.flags.every(i => typeof i === "string")) {
                const flagsUnknown = <readonly unknown[]>kwargs.flags;
                flags = parseLegacyFlags(<readonly string[]>flagsUnknown);
            } else {
                flags = validateFlags(kwargs.flags);
            }
            if (flags.every(i => !i.enabled)) {
                flags[0].enabled = true;
            }
            kwargs.flags = Object.freeze(flags.map(i => Object.freeze(i)));
        } else {
            kwargs.flags = DEFAULT_FLAGS;
        }

        if (typeof kwargs.custom !== "boolean") {
            kwargs.custom = true;
        }

        if (!Number.isInteger(kwargs.weight)) {
            kwargs.weight = 1;
        } else {
            kwargs.weight = clamp(<number>kwargs.weight, 1, 9);
        }

        if (!CommonIsObject(kwargs.activeHooks)) {
            kwargs.activeHooks = {};
        } else {
            kwargs.activeHooks = validateHooks(kwargs.activeHooks, wheelHookRegister);
        }
        return kwargs as Required<FWItemSetKwargTypes>;
    }

    /**
     * Construct a new {@link FWItemSet} instance from the passed object
     * @param kwargs The to-be parsed object
     */
    static fromObject(mbsList: readonly (null | FWItemSet)[], kwargs: FWSimplePartialItemSet): FWItemSet {
        const args: FWItemSetArgTypes = [
            kwargs.name,
            kwargs.itemList,
            mbsList,
            kwargs.stripLevel,
            kwargs.equipLevel,
            kwargs.flags,
            kwargs.custom,
            kwargs.weight,
            kwargs.activeHooks,
        ];
        return new FWItemSet(...args);
    }

    /**
     * Factory method for generating {@link FWItemSetOption.Script} callbacks.
     * @returns A valid {@link FWItemSetOption.Script} callback
     */
    scriptFactory(flag: FWFlag, hooks: Readonly<Record<string, FWHook>>): (character?: null | Character) => void {
        const assets = this.itemList.map(({Name, Group}) => AssetGet(Player.AssetFamily, Group, Name));

        return (character) => {
            character = character ?? Player;
            const condition = getStripCondition(this.equipLevel, character);
            const items = this.itemList.filter((_, i) => {
                const asset = assets[i];
                if (asset == null) {
                    return false;
                } else if (asset.Group.Category !== "Appearance") {
                    return true;
                } else {
                    return condition(asset);
                }
            });

            fortuneWheelEquip(this.name, items, this.stripLevel, character ?? Player, hooks, flag);
        };
    }

    getIDs(): string[] {
        const flagsNumeric = [];
        for (const [i, flag] of this.flags.entries()) {
            if (flag.enabled) {
                flagsNumeric.push(i);
            }
        }

        /**
         * - Reserve the `[0, 2**8)` range (extended ASCII) for BC's default
         * - Reserve the `[2**8, 2**9)` range for MBS's builtin options
         * - "Reserve" the `[2**9, 2**16)` range for MBS's custom options
         */
        let start: number;
        if (!this.custom) {
            start = ITEM_SET_CATEGORY_ID_RANGE + DEFAULT_ITEM_SET_INDEX[this.name] * ITEM_SET_FLAG_COUNT;
            if (Number.isNaN(start)) {
                throw new Error(`Unknown default item set "${this.name}"`);
            }
        } else {
            // Stagger the itemset/command IDs:
            // 16 items sets followed by 16 commands, followed by 16 item sets, etc
            const offset = 2 + Math.floor(this.index / 16);
            start = offset * ITEM_SET_CATEGORY_ID_RANGE + this.index * ITEM_SET_FLAG_COUNT;
            if (start < 0) {
                throw new Error(`Item set "${this.name}" absent from currently selected fortune wheel sets`);
            }
        }

        return generateIDs(start, flagsNumeric);
    }

    /**
     * Convert this instance into a list of {@link FWItemSetOption}.
     * @returns A list of wheel of fortune options
     */
    toOptions(): FWItemSetOption[] {
        const flags = this.flags.filter(flag => flag.enabled);
        const IDs = this.getIDs();
        return flags.map((flag, i) => {
            const Description = flag.type === null ? this.name : `${this.name}: ${getFlagDescription(flag)}`;
            let Default = true;
            switch (flag.type) {
                case "HighSecurityPadlock":
                    Default = false;
                    break;
                case "TimerPasswordPadlock":
                    Default = i !== 4;
                    break;
                case "ExclusivePadlock":
                    break;
                case null:
                    Default = false;
                    break;
            }
            return {
                ID: IDs[i],
                Color: sample(FORTUNE_WHEEL_COLORS) as FortuneWheelColor,
                Script: this.scriptFactory(flag, this.activeHooks),
                Description,
                Default,
                Custom: this.custom,
                Parent: this,
                Flag: flag,
                Weight: this.weight,
            };
        });
    }

    /** Return a (JSON safe-ish) object representation of this instance. */
    toJSON(): FWSimpleItemSet {
        const activeHooks: Record<string, FWJsonHook> = {};
        for (const [name, hook] of Object.entries(this.activeHooks)) {
            const kwargs: FWJsonHook["kwargs"] = {};
            for (const [kwargName, kwarg] of Object.entries(hook.kwargs)) {
                switch (kwarg.type) {
                    case "select-multiple":
                        kwargs[kwargName] = { ...kwarg, value: Array.from(kwarg.value) };
                        break;
                    default:
                        kwargs[kwargName] = kwarg;
                }
            }
            activeHooks[name] = { ...hook, kwargs };
        }

        return {
            name: this.name,
            itemList: this.itemList,
            stripLevel: this.stripLevel,
            equipLevel: this.equipLevel,
            flags: this.flags,
            custom: this.custom,
            weight: this.weight,
            activeHooks,
        };
    }
}

/** {@link FWCommand} constructor argument types in tuple form */
type FWCommandArgTypes = ConstructorParameters<typeof FWCommand>;

/** {@link FWCommand} constructor argument types in tuple form */
type FWCommandKwargTypes = {
    name: string,
    mbsList: readonly (null | FWCommand)[],
    weight?: number
};

/** A class for storing custom user-specified wheel of fortune item sets. */
export class FWCommand extends FWObject<FWCommandOption> implements FWSimpleCommand {
    // @ts-ignore: false positive; narrowing of superclass attribute type
    readonly custom: true;
    // @ts-ignore: false positive; narrowing of superclass attribute type
    readonly mbsList: readonly (null | FWCommand)[];

    /** Initialize the instance */
    constructor(
        name: string,
        mbsList: readonly (null | FWCommand)[],
        weight?: number,
    ) {
        const kwargs = FWCommand.validate({ name, mbsList, weight });
        super(kwargs.name, true, kwargs.mbsList, kwargs.weight);
    }

    /** Validation function for the classes' constructor */
    static validate(kwargs: FWCommandKwargTypes): Required<FWCommandKwargTypes> {
        if (typeof kwargs.name !== "string") {
            throw new TypeError(`Invalid "name" type: ${typeof kwargs.name}`);
        }

        if (!Array.isArray(kwargs.mbsList)) {
            throw new TypeError(`Invalid "mbsList" type: ${typeof kwargs.mbsList}`);
        }

        if (!Number.isInteger(kwargs.weight)) {
            kwargs.weight = 1;
        } else {
            kwargs.weight = clamp(<number>kwargs.weight, 1, 9);
        }
        return <Required<FWCommandKwargTypes>>kwargs;
    }

    /**
     * Construct a new {@link FWItemSet} instance from the passed object
     * @param mbsList
     * @param kwargs The to-be parsed object
     */
    static fromObject(mbsList: readonly (null | FWCommand)[], kwargs: FWSimplePartialCommand): FWCommand {
        const args: FWCommandArgTypes = [
            kwargs.name,
            mbsList,
            kwargs.weight,
        ];
        return new FWCommand(...args);
    }

    /**
     * Convert this instance into a list of {@link FWItemSetOption}.
     * @param idExclude Characters that should not be contained within any of the {@link FWItemSetOption.ID} values
     * @returns A list of wheel of fortune options
     */
    toOptions(): FWCommandOption[] {
        const [ID] = this.getIDs();
        return [{
            ID: ID,
            Color: sample(FORTUNE_WHEEL_COLORS) as FortuneWheelColor,
            Description: this.name,
            Default: true,
            Custom: this.custom,
            Parent: this,
            Script: undefined,
            Flag: undefined,
            Weight: this.weight,
        }];
    }

    getIDs(): [string] {
        // Stagger the itemset/command IDs:
        // 16 items sets followed by 16 commands, followed by 16 item sets, etc
        const offset = 3 + Math.floor(this.index / 16);
        const ID = offset * ITEM_SET_CATEGORY_ID_RANGE + this.index;
        return [String.fromCharCode(ID)];
    }

    /** Return a (JSON safe-ish) object representation of this instance. */
    toJSON(): FWSimpleCommand {
        return {
            name: this.name,
            weight: this.weight,
        };
    }
}

/** Gather and return all valid wheel of fortune IDs from the passed lists */
export function getFWIDs(...fwObjectLists: (readonly (null | FWObject<any>)[])[]): Set<string> {
    const idList: string[] = [];
    for (const fwObjectList of fwObjectLists) {
        for (const fwObject of fwObjectList) {
            if (fwObject === null) {
                continue;
            }
            idList.push(...fwObject.getIDs());
        }
    }
    return new Set(idList);
}

export function createWeightedWheelIDs(ids: string): string {
    const idBaseList = Array.from(ids).flatMap(id => {
        const option = WheelFortuneOption.find(o => o.ID === id);
        return option === undefined ? [] : Array(option.Weight ?? 1).fill(id);
    });
    if (idBaseList.length === 0) {
        return "";
    }

    const idList: string[] = [];
    while (idList.length < 50) {
        idList.push(...sortBy(idBaseList, Math.random));
    }
    return idList.join("");
}
