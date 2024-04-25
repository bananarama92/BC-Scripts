/** The MBS version. */
declare const MBS_VERSION: typeof mbs.MBS_VERSION;

/** Base type for fortune wheel options */
type FWObjectOption = WheelFortuneOptionType;

/** Type representing MBS `FWItemSet` fortune wheel options */
interface FWItemSetOption extends Required<FWObjectOption> {
    /**
     * An optional script that will be executed whenever the option is picked.
     * @param character The to-be affected player- or simple character
     */
    readonly Script: (character?: null | Character) => void,
    /** The parent item set */
    readonly Parent: import("../common_bc").FWItemSet,
}

interface FWHook {
    /** The mod SDK name of the mod */
    readonly modName: string,
    /** The type of event listener */
    readonly hookType: import("../fortune_wheel/events/register").ExtendedWheelEvents.Events.Names,
    /** The ID of the event listener */
    readonly hookName: string,
    /** User-specified options for conditionally running the event listener */
    readonly kwargs: Readonly<Record<string, WheelEvents.Kwargs.All>>;
    /** The config of */
    readonly kwargsConfig: Record<string, WheelEvents.KwargsConfig.All>;
}

interface FWJsonHook extends Omit<Mutable<FWHook>, "kwargs" | "kwargsConfig"> {
    /** User-specified options for conditionally running the event listener */
    kwargs: Record<string, WheelEvents.Kwargs.JsonAll>;
}

interface FWSelectedHook extends Omit<FWHook, "kwargs" | "kwargsConfig"> {
    /** User-specified options for conditionally running the event listener */
    readonly kwargs: Map<string, WheelEvents.Kwargs.All>;
}

/** Type representing MBS `FWCommand` fortune wheel options */
interface FWCommandOption extends FWObjectOption {
    /**
     * Unused field for `FWCommand`.
     * An optional script that will be executed whenever the option is picked.
     */
    readonly Script: undefined,
    /**
     * Unused field for `FWCommand`.
     * The type of lock flavor.
     */
    readonly Flag: undefined,
    /** A description of the option */
    readonly Description: string,
    /** Whether the option should be enabled by default */
    readonly Default: boolean,
    /** Whether this is a custom user-specified option */
    readonly Custom: true,
    /** The parent item set */
    readonly Parent: import("../common_bc").FWCommand,
}

interface FWFlagBase<Type extends null | AssetLockType> {
    /** The lock type associated with the flag */
    readonly type: Type,
    /** A human-readable description of the lock type */
    readonly description: string;
    /** Whether the user has enabled the flag or not */
    enabled: boolean,
}

type FWFlagExclusivePadlock = FWFlagBase<"ExclusivePadlock">;
type FWFlagHighSecurityPadlock = FWFlagBase<"HighSecurityPadlock">;
interface FWFlagTimerPasswordPadlock extends FWFlagBase<"TimerPasswordPadlock"> {
    /** The lock duration in seconds; value must fall in the `[60, 240 * 60]` interval */
    time: number,
}
type FWFlagNoLock = FWFlagBase<null>;

type FWFlag = (
    FWFlagExclusivePadlock
    | FWFlagTimerPasswordPadlock
    | FWFlagHighSecurityPadlock
    | FWFlagNoLock
);

/**
 * An enum with various strip levels for {@link characterStrip}.
 * All items up to and including the specified levels will be removed.
 */
type StripLevel = 0 | 1 | 2 | 3 | 4;

interface FWItemBase {
    /** The name of the item */
    Name: string,
    /** The group of the item */
    Group: AssetGroupName,
    /** The optional color of the item */
    Color?: readonly string[],
    /** An optional callback whose output denotes whether the item should be equipped */
    Equip?: (character: Character) => boolean,
    /** Optional crafted item data */
    Craft?: Partial<CraftingItem>,
    /** @deprecated superseded by the MBS 1.8 `afterItemEquip` event */
    ItemCallback?: never;
    /** Whether this is a custom user-specified item set */
    Custom?: boolean,
    /** The type of the item */
    TypeRecord?: TypeRecord,
    /**
     * The properties of the item.
     * Note that {@link FWItemBase.TypeRecord}-specific properties should be excluded from here.
     */
    Property?: ItemProperties,
}

interface FWItem extends Readonly<FWItemBase> {
    readonly Craft: undefined | Readonly<CraftingItem>,
    readonly Custom: boolean,
    readonly TypeRecord: undefined | Readonly<TypeRecord>,
    /** @deprecated superseded by {@link FWItem.TypeRecord} */
    readonly Type?: never;
    readonly Property: Readonly<ItemProperties>,
    readonly Color: undefined | readonly string[],
    /** @deprecated superseded by the MBS 1.8 `afterItemEquip` event */
    readonly ItemCallback?: never;
    readonly Equip: undefined | ((character: Character) => boolean),
}

/** A union with the names of all pre-defined MBS item sets. */
type FortuneWheelNames = "leash_candy" | "mummy" | "maid" | "statue";

/** A union of valid wheel of fortune button colors */
type FortuneWheelColor = "Blue" | "Gold" | "Gray" | "Green" | "Orange" | "Purple" | "Red" | "Yellow";

/** The (unparsed) MBS settings */
interface MBSProtoSettings {
    /** The MBS version */
    Version?: string,
    /** A backup string containing the serialized crafting data of all crafting items beyond the BC default */
    CraftingCache?: string,
    /** A sealed array with all custom user-created wheel of fortune item sets */
    FortuneWheelItemSets?: (null | FWSimpleItemSet)[],
    /** A sealed array with all custom user-created wheel of fortune command sets */
    FortuneWheelCommands?: (null | FWSimpleCommand)[],
    /** A sealed array with various ID-string presets */
    FortuneWheelPresets?: (null | Mutable<WheelPreset>)[],
    /** @deprecated alias for {@link MBSSettings.FortuneWheelItemSets} */
    FortuneWheelSets?: MBSProtoSettings["FortuneWheelItemSets"],
    /** Whether or not one can roll the wheel of fortune when restrained */
    RollWhenRestrained?: boolean;
    /**
     * Whether or not one can modify MBS settings when restrained.
     * Note that this does not affect the customization of wheel outfits themselves, which are always modifiable.
     */
    LockedWhenRestrained?: boolean;
    /** Whether to use an alternate garbling algorithm based on {@link https://github.com/CordeliaMist/Dalamud-GagSpeak} */
    AlternativeGarbling?: boolean;
    /** Whether to drop trailing characters for the heaviest gags */
    DropTrailing?: boolean;
    /** Whether to interpolate between gag levels using different garbling tables */
    GarblePerSyllable?: boolean;
    /**
     * Whether to allow up to 398 extended ASCII characters in a crafted item description
     * @deprecated Removed as of MBS v1.7.32; functionality incorporated into base BC as of R109
     */
    ExtendedCraftingDescription?: boolean;
    /** Show the MBS changelog in chat whenever a new MBS version is released */
    ShowChangelog?: boolean;
}

type MBSSettingsDeprecated = keyof Pick<MBSProtoSettings,
    "FortuneWheelSets"
    | "ExtendedCraftingDescription"
>;

/** The MBS settings */
interface MBSSettings extends Record<Exclude<keyof MBSProtoSettings, MBSSettingsDeprecated>, unknown> {
    /** The MBS version */
    readonly Version: typeof mbs.MBS_VERSION,
    /** A backup string containing the serialized crafting data of all crafting items beyond the BC default */
    CraftingCache: string,
    /** A sealed array with all custom user-created wheel of fortune item sets */
    readonly FortuneWheelItemSets: (null | import("../common_bc").FWItemSet)[],
    /** A sealed array with all custom user-created wheel of fortune command sets */
    readonly FortuneWheelCommands: (null | import("../common_bc").FWCommand)[],
    /** A sealed array with various ID-string presets */
    FortuneWheelPresets: (null | WheelPreset)[],
    /** Whether or not one can roll the wheel of fortune when restrained */
    RollWhenRestrained: boolean;
    /**
     * Whether or not one can modify MBS settings when restrained.
     * Note that this does not affect the customization of wheel outfits themselves, which are always modifiable.
     */
    LockedWhenRestrained: boolean;
    /** Whether to use an alternate garbling algorithm based on {@link https://github.com/CordeliaMist/Dalamud-GagSpeak} */
    AlternativeGarbling: boolean;
    /** Whether to drop trailing characters for the heaviest gags */
    DropTrailing: boolean;
    /** Whether to interpolate between gag levels using different garbling tables */
    GarblePerSyllable: boolean;
    ShowChangelog: boolean;
}

/** An interface for representing clickable buttons */
interface ClickAction {
    /** A 4-tuple with the buttons X & Y coordinates, its width and its height */
    readonly coords: RectTuple,
    /** A callback to-be executed when the button is clicked */
    readonly next: () => void,
    /** Whether the button click requires a player character */
    readonly requiresPlayer: boolean,
}

/** An interface for representing click- and drawable buttons */
interface ButtonAction {
    readonly name: string,
    /** A 4-tuple with the buttons X & Y coordinates, its width and its height */
    readonly coords: RectTuple,
    /** A callback to-be executed when the button is clicked */
    readonly click: (event: MouseEvent | TouchEvent) => boolean,
    /** A callback to-be executed when the button is drawn */
    readonly draw: (...coords: RectTuple) => void,
}

interface UIElement {
    readonly coords: RectTuple,
    readonly load?: () => void,
    readonly click?: (event: MouseEvent | TouchEvent) => void,
    readonly run: (...coords: RectTuple) => void,
    readonly exit?: () => void,
    readonly unload?: () => void,
    readonly page?: number,
}

/** A simplified interface representing {@link FWItemSet} */
interface FWSimpleItemSet {
    name: string,
    itemList: readonly FWItem[],
    stripLevel: StripLevel,
    equipLevel: StripLevel,
    flags: readonly Readonly<FWFlag>[],
    custom: boolean,
    weight: number,
    activeHooks: Readonly<Record<string, FWJsonHook>>,
}

/** A simplified (partial) interface representing {@link FWItemSet} */
interface FWSimplePartialItemSet extends Omit<Partial<FWSimpleItemSet>, "activeHooks"> {
    name: string,
    itemList: readonly FWItem[],
    activeHooks: Readonly<Record<string, FWJsonHook | FWHook>>,
}

/** A simplified interface representing {@link FWCommand} */
interface FWSimpleCommand {
    name: string,
    weight: number,
}

/** A simplified (partial) interface representing {@link FWCommand} */
interface FWSimplePartialCommand extends Partial<FWSimpleCommand> {
    name: string,
}

interface WheelPreset {
    readonly name: string,
    readonly ids: string,
}

/** The maximum and actually used size of {@link Character.OnlineSharedSettings} */
interface DataSize {
    /** The currently used data size in bytes */
    value: number,
    /** The currently used data size in bytes per key */
    valueRecord: Record<string, number>;
    /** The maximum data size in bytes */
    readonly max: number,
    /** A safety marigin in the `[0, 1]` interval applied as a factor to `max` */
    readonly marigin: number,
}

declare namespace SettingsStatus {
    interface Base {
        settings: MBSSettings,
        ok: boolean,
        err: Partial<Record<keyof MBSSettings, [msg: string, ...rest: unknown[]][]>>,
    }

    interface _Expanded extends Base {
        status: 0 | 3,
    }

    type Expanded = _Expanded | { ok: false, status: 1 | 2 };
}

type SettingsStatus = 0 | 1 | 2 | 3;

declare module "*.scss" {
    export type Styles = Record<string, string>;
    const styles: Styles;
    export default styles;
    export type ClassNames = keyof Styles;
}

declare module "*.md" {
    const md: string;
    export default md;
}
