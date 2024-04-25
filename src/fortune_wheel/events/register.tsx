import { isArray } from "../../common";
import { validateKwargsConfig } from "./kwarg_config_validation";

export function getGroupNameKwargs(
    defaults: "all" | "none" | ((group: AssetGroup) => boolean),
    groupFilter: ((group: AssetGroup) => boolean),
): WheelEvents.KwargsConfig.SelectMultiple {
    const groups: Partial<Record<AssetGroup["Category"], { label: string, groups: AssetGroup[] }>> = {
        Appearance: { label: "Body and clothes", groups: [] },
        Item: { label: "Items and restraints", groups: [] },
    };

    AssetGroup.filter(groupFilter).sort((g1, g2) => {
        return (
            g1.Category.localeCompare(g2.Category)
            || g1.Description.localeCompare(g2.Description)
            || g1.Name.localeCompare(g2.Name)
        );
    }).forEach(g => {
        groups[g.Category]?.groups.push(g);
    });

    let defaultFilter: (group: AssetGroup) => boolean;
    switch (defaults) {
        case "all":
            defaultFilter = () => true;
            break;
        case "none":
            defaultFilter = () => false;
            break;
        default:
            defaultFilter = defaults;
            break;
    }

    return {
        type: "select-multiple",
        label: "The item group(s) to which the option will be applied",
        required: true,
        options: Object.values(groups).flatMap(({ label, groups }) => {
            return groups.map(g => {
                return {
                    label: g.Description,
                    value: g.Name,
                    group: label,
                    default: defaultFilter(g),
                };
            });
        }),
    };
}

/** Namespace with extended, MBS-exclusive {@link WheelEvents} types */
export namespace ExtendedWheelEvents {
    export namespace Events {
        export interface ValidateItemUnequip extends WheelEvents.Events.Base {
            readonly targetGroup: AssetGroup;
            /** The to-be equipped asset */
            readonly newAsset: null | Asset;
            /** The previously equipped item (if any) */
            readonly oldItem: null | Item;
        }

        export interface Color extends WheelEvents.Events.ItemBase {
            readonly color: readonly string[];
        }

        export interface TypeRecord extends WheelEvents.Events.ItemBase {
            readonly typeRecord: null | Readonly<globalThis.TypeRecord>;
        }

        export interface Difficulty extends WheelEvents.Events.ItemBase {
            readonly difficultyModifier: number;
        }

        export interface Craft extends WheelEvents.Events.ItemBase {
            readonly craft: null | Readonly<Pick<CraftingItem, "Name" | "Description" | "Property">>;
        }

        export interface Property extends WheelEvents.Events.ItemBase {
            readonly properties: Readonly<ItemProperties>;
        }

        export type BeforeOutfitEquip = WheelEvents.Events.BeforeOutfitEquip;
        export type ValidateItemEquip = WheelEvents.Events.ValidateItemEquip;
        export type BeforeItemEquip = WheelEvents.Events.BeforeItemEquip;
        export type AfterItemEquip = WheelEvents.Events.AfterItemEquip;
        export type AfterOutfitEquip = WheelEvents.Events.AfterOutfitEquip;

        /** A mapping with all available event types mapped to their respective events */
        export interface Mapping extends WheelEvents.Events.Mapping {
            validateItemUnequip: ValidateItemUnequip;
            color: Color;
            typeRecord: TypeRecord;
            difficulty: Difficulty;
            craft: Craft;
            property: Property;
        }

        /** The names of all available events */
        export type Names = keyof Mapping;
    }

    /** An interface with event-specific return types */
    export interface ListenerReturnType extends WheelEvents.ListenerReturnType {
        validateItemUnequip: null | string;
        color: null | (undefined | string)[];
        difficulty: null | number;
        craft: null | Partial<Pick<CraftingItem, "Name" | "Description" | "Property">>;
        typeRecord: null | Partial<TypeRecord>;
        property: null | Partial<ItemProperties>;
        preProcess: null;
    }

    /**
     * @param event The event
     * @param kwargs An object with further options as configured by the end user according to the limits as specified in {@link Options.kwargs}.
     */
    export type Listener<EventType extends Events.Names> = (
        event: Events.Mapping[EventType],
        kwargs: Readonly<Record<string, undefined | WheelEvents.Kwargs.All>>,
    ) => void | undefined | ListenerReturnType[EventType];

    /** Registration options for a to-be registered event listener */
    export interface Options<EventType extends Events.Names> extends WheelEvents.Options<any> {
        /**
         * The to-be registered callback of the hook.
         * @param event The event object
         * @param kwargs An object with further options as configured by the end user, allowed keys (and their values) being configured by {@link kwargs}.
         * @returns A nullish value
         */
        readonly listener: Listener<EventType>,
        readonly conditional: boolean;
        readonly showConfig?: boolean;
    }
}

interface EventStruct<T extends ExtendedWheelEvents.Events.Names> extends Required<ExtendedWheelEvents.Options<T>> {
    readonly hookType: T;
    readonly registrationData: import ("bondage-club-mod-sdk").ModSDKModInfo;
    readonly label: readonly (string | HTMLElement)[],
    readonly description: readonly (string | HTMLElement)[],
}

function validateOptions<T extends ExtendedWheelEvents.Events.Names>(
    hookType: T,
    registrationData: import ("bondage-club-mod-sdk").ModSDKModInfo,
    options: ExtendedWheelEvents.Options<T>,
): EventStruct<T> {
    const descriptionCandidate = options.description ?? [];
    const description = isArray(descriptionCandidate) ? descriptionCandidate : [descriptionCandidate];
    const label = isArray(options.label) ? options.label : [options.label];
    const kwargs = options.kwargs ?? {};

    const prefix = `Hook "${registrationData.name}-${hookType}-${options.hookName}"`;

    if (typeof options.listener !== "function") {
        throw new TypeError(`${prefix}: Invalid "listener" type: "${typeof options.listener}"`);
    }

    if (typeof options.hookName !== "string") {
        throw new TypeError(`${prefix}: Invalid "hookName" type: "${typeof options.hookName}"`);
    } else if (!options.hookName) {
        throw new Error(`${prefix}: Invalid "hookName" value; string must be non-empty`);
    }

    if (!isArray(options.label) && typeof options.label !== "string") {
        throw new TypeError(`${prefix}: Invalid "label" type: "${typeof options.label}"`);
    } else if (!label.every(i => typeof i === "string" || i instanceof HTMLElement)) {
        throw new TypeError(`${prefix}: Invalid "label" array-values; all values must be strings or html elements`);
    }

    if (!isArray(options.description) && typeof options.description !== "string" && options.description != null) {
        throw new TypeError(`${prefix}: Invalid "description" type: "${typeof options.description}"`);
    } else if (!description.every(i => typeof i === "string" || i instanceof HTMLElement)) {
        throw new TypeError(`${prefix}: Invalid "description" array-values; all values must be strings or html elements`);
    }

    if (typeof options.conditional !== "boolean") {
        throw new TypeError(`${prefix}: Invalid "conditional" type: "${typeof options.conditional}"`);
    }

    if (options.showConfig != null && typeof options.showConfig !== "boolean") {
        throw new TypeError(`${prefix}: Invalid "showConfig" type: "${typeof options.showConfig}"`);
    }

    if (options.kwargs != null && !CommonIsObject(options.kwargs)) {
        throw new TypeError(`${prefix}: Invalid "kwargs" type: "${typeof options.kwargs}"`);
    }

    validateKwargsConfig(kwargs, prefix);
    return Object.freeze({
        hookType,
        registrationData,
        listener: options.listener,
        hookName: options.hookName,
        label,
        description,
        conditional: options.conditional,
        showConfig: options.showConfig ?? options.conditional,
        kwargs,
    });
}

type _WheelHookRegister = { readonly [k in ExtendedWheelEvents.Events.Names]: readonly EventStruct<k>[] };

export class WheelHookRegister implements _WheelHookRegister {
    readonly validKeys: ReadonlySet<ExtendedWheelEvents.Events.Names> = Object.freeze(new Set([
        "validateItemUnequip",
        "color",
        "difficulty",
        "craft",
        "typeRecord",
        "property",

        "beforeOutfitEquip",
        "validateItemEquip",
        "beforeItemEquip",
        "afterItemEquip",
        "afterOutfitEquip",
    ] as const));

    readonly validateItemUnequip: EventStruct<"validateItemUnequip">[] = [];
    readonly color: EventStruct<"color">[] = [];
    readonly difficulty: EventStruct<"difficulty">[] = [];
    readonly craft: EventStruct<"craft">[] = [];
    readonly typeRecord: EventStruct<"typeRecord">[] = [];
    readonly property: EventStruct<"property">[] = [];

    readonly beforeOutfitEquip: EventStruct<"beforeOutfitEquip">[] = [];
    readonly validateItemEquip: EventStruct<"validateItemEquip">[] = [];
    readonly beforeItemEquip: EventStruct<"beforeItemEquip">[] = [];
    readonly afterItemEquip: EventStruct<"afterItemEquip">[] = [];
    readonly afterOutfitEquip: EventStruct<"afterOutfitEquip">[] = [];

    values() {
        return Array.from(this.validKeys).flatMap(k => this[k].map((e): EventStruct<any> => e));
    }

    get<T extends ExtendedWheelEvents.Events.Names>(modName: string, hookType: T, hookName: string): EventStruct<T> | null {
        return this[hookType]?.find((i): i is EventStruct<any> => i.registrationData.name === modName && i.hookName === hookName) ?? null;
    }

    /**
     * Register an event listener
     * @param key
     * @param registrationData
     * @param options
     * @returns
     */
    addEventListener<T extends ExtendedWheelEvents.Events.Names>(
        hookType: T,
        registrationData: import ("bondage-club-mod-sdk").ModSDKModInfo,
        options: ExtendedWheelEvents.Options<T>,
    ) {
        if (this[hookType].some(i => i.registrationData.name === registrationData.name && i.hookName === options.hookName)) {
            throw new Error(`Hook "${registrationData.name}-${hookType}-${options.hookName}" has already been registered`);
        }

        switch (hookType) {
            case "validateItemUnequip":
            case "color":
            case "difficulty":
            case "craft":
            case "typeRecord":
            case "property":
            case "validateItemEquip":
            case "beforeItemEquip":
            case "afterItemEquip":
                if (!options?.kwargs?.targetGroups) {
                    options = {
                        ...options,
                        kwargs: {
                            ...options.kwargs,
                            targetGroups: getGroupNameKwargs("all", (g) => g.AllowNone),
                        },
                    };
                }
                break;
        }


        const lst: EventStruct<any>[] = this[hookType];
        lst.push(validateOptions(hookType, registrationData, options));
    }

    run<T extends ExtendedWheelEvents.Events.Names> (
        hookType: T,
        event: ExtendedWheelEvents.Events.Mapping[T],
        allKwargs: Partial<Record<string, Record<string, WheelEvents.Kwargs.All>>>,
        loggerOutputs: Partial<Record<ExtendedWheelEvents.Events.Names, Record<string, Record<string, Record<"succes" | "error" | "skip", {
            readonly event: WheelEvents.Events.Base;
            readonly kwargs: Record<string, WheelEvents.Kwargs.All>;
            readonly reason?: unknown;
        }[]>>>>>,
    ): NonNullable<ExtendedWheelEvents.ListenerReturnType[T]>[] {
        const log: typeof loggerOutputs[ExtendedWheelEvents.Events.Names] = (loggerOutputs[hookType] ??= {});
        const ret = this[hookType].map(({ listener, hookName, conditional, registrationData }) => {
            log[registrationData.name] ??= {};
            log[registrationData.name][hookName] ??= { "error": [], "succes": [], "skip": [] };

            const key = `${registrationData.name}-${hookType}-${hookName}`;
            let kwargs = allKwargs[key];
            if (!kwargs && conditional) {
                log[registrationData.name][hookName].skip.push({ event, kwargs: kwargs ?? {}, reason: "Disabled event listener" });
                return;
            }
            kwargs ??= {};

            if ("newAsset" in event && event.newAsset && kwargs.targetGroups) {
                switch (kwargs.targetGroups.type) {
                    case "select":
                        if (kwargs.targetGroup.value === event.newAsset.Group.Name) {
                            break;
                        } else {
                            log[registrationData.name][hookName].skip.push({ event, kwargs, reason: "Target group mismatch" });
                            return;
                        }
                    case "select-multiple":
                        if (kwargs.targetGroups.value.has(event.newAsset.Group.Name)) {
                            break;
                        } else {
                            log[registrationData.name][hookName].skip.push({ event, kwargs, reason: "Target group mismatch" });
                            return;
                        }
                }
            }

            let result;
            try {
                result = listener(event as any, kwargs);
            } catch (error) {
                log[registrationData.name][hookName].error.push({ event, kwargs, reason: error });
                return null;
            }

            log[registrationData.name][hookName].succes.push({ event, kwargs });
            return result;
        }).filter(Boolean) as NonNullable<ExtendedWheelEvents.ListenerReturnType[T]>[];
        return ret;
    }
}

/** Registration entry point for MBS wheel of fortune event listeners */
export const wheelHookRegister = new WheelHookRegister();
