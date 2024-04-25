import { pick } from "lodash";
import bcModSdk from "bondage-club-mod-sdk";

import { wheelHookRegister } from "../fortune_wheel";

const ALLOWED_HOOK_TYPES = Object.freeze(new Set([
    "beforeOutfitEquip",
    "validateItemEquip",
    "beforeItemEquip",
    "afterItemEquip",
    "afterOutfitEquip",
] as const satisfies WheelEvents.Events.Names[]));

/**
 * @param hookType The type of to-be registered event listener
 * @param addonName The mod SDK info of the addon trying to register the listener
 * @param options Registration options for the event listener
 */
export const addEventListener: typeof mbs.wheelEvents.addEventListener = function (
    hookType,
    addonName,
    options,
) {
    if (!ALLOWED_HOOK_TYPES.has(hookType)) {
        throw new Error(`Invalid hook type "${hookType}"`);
    }

    const addonData = bcModSdk.getModsInfo().find(i => i.name === addonName);
    if (!addonData) {
        throw new Error(`Addon "${addonName}" is not registered in bcModSdk`);
    } else if (addonName === "mbs") {
        throw new Error("Cannot register event listener to addon \"MBS\"");
    }

    const fullOptions: import("../fortune_wheel").ExtendedWheelEvents.Options<any> = {
        ...pick(options, "listener", "hookName", "label", "description", "kwargs"),
        conditional: true,
        showConfig: true,
    };
    wheelHookRegister.addEventListener(hookType, addonData, fullOptions);
};

/**
 * Get all registered event listeners.
 * @returns An object mapping addon names, to event listener types, to a set of all its registered listener names.
 */
export const listEventListeners: typeof mbs.wheelEvents.listEventListeners = function () {
    const ret: ReturnType<typeof mbs.wheelEvents.listEventListeners> = {};
    for (const data of wheelHookRegister.values()) {
        const hookType = data.hookType as WheelEvents.Events.Names;
        if (!ALLOWED_HOOK_TYPES.has(data.hookType)) {
            continue;
        }

        ret[data.registrationData.name] ??= {};
        (ret[data.registrationData.name][hookType] ??= new Set).add(data.hookName);
    }
    return ret;
};
