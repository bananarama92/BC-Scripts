import { pick, clamp, inRange } from "lodash";

import { isArray } from "../../common";
import { wheelHookRegister } from "./register";

function _validateSelect(
    kwarg: WheelEvents.Kwargs.Select,
    kwargConfig?: WheelEvents.KwargsConfig.All,
): null | WheelEvents.Kwargs.All {
    const kwargParsed: Mutable<WheelEvents.Kwargs.Select> = pick(kwarg, "value", "type");

    switch (kwargConfig?.type) {
        case undefined:
            if (kwargParsed.value !== undefined && typeof kwargParsed.value !== "string") {
                return null;
            }
            return kwargParsed;
        case "select":
            if (kwargParsed.value !== undefined && typeof kwargParsed.value !== "string") {
                const option = kwargConfig.options.find(i => i.default);
                kwargParsed.value = option ? (option.value ?? option.label) : undefined;
            } else if (kwargConfig.options.some(i => (i.value ?? i.label) === kwargParsed.value)) {
                const option = kwargConfig.options.find(i => (i.value ?? i.label) === kwargParsed.value);
                kwargParsed.value = option ? (option.value ?? option.label) : undefined;
            }
            return kwargParsed;
        default:
            return null;
    }
}

function _validateSelectMultiple(
    kwarg: WheelEvents.Kwargs.SelectMultiple | WheelEvents.Kwargs.SelectMultipleJson,
    kwargConfig?: WheelEvents.KwargsConfig.All,
): null | WheelEvents.Kwargs.All {
    const kwargParsed: Mutable<WheelEvents.Kwargs.SelectMultiple> = pick(kwarg as WheelEvents.Kwargs.SelectMultiple, "value", "type", "state");
    if (isArray(kwarg.value)) {
        kwargParsed.value = new Set(kwarg.value);
    }

    switch (kwargConfig?.type) {
        case undefined:
            if (!(kwargParsed.value instanceof Set)) {
                return null;
            }
            if (!["some", "all", "none"].some(i => kwargParsed.state === i)) {
                return null;
            }
            return kwargParsed;
        case "select-multiple": {
            if (!(kwargParsed.value instanceof Set)) {
                const options = kwargConfig.options.filter(o => o.default);
                kwargParsed.value = new Set(options.map(o => o.value ?? o.label));
            } else {
                const values = new Set(kwargConfig.options.map(o => o.value ?? o.label));
                kwargParsed.value = new Set(Array.from(kwargParsed.value).filter(value => values.has(value)));
            }

            if (kwargParsed.value.size === 0) {
                kwargParsed.state = "none";
            } else if (kwargParsed.value.size === kwargConfig.options.length) {
                kwargParsed.state = "all";
            } else {
                kwargParsed.state = "some";
            }
            return kwargParsed;
        }
        default:
            return null;
    }
}

function _validateCheckbox(
    kwarg: WheelEvents.Kwargs.Checkbox,
    kwargConfig?: WheelEvents.KwargsConfig.All,
): null | WheelEvents.Kwargs.All {
    const kwargParsed: Mutable<WheelEvents.Kwargs.Checkbox> = pick(kwarg, "value", "type");

    switch (kwargConfig?.type) {
        case undefined:
            if (typeof kwargParsed.value !== "boolean") {
                return null;
            }
            return kwargParsed;
        case "checkbox":
            if (typeof kwargParsed.value !== "boolean") {
                kwargParsed.value = kwargConfig.default;
            }
            return kwargParsed;
        default:
            return null;
    }
}

function _validateNumber(
    kwarg: WheelEvents.Kwargs.Number,
    kwargConfig?: WheelEvents.KwargsConfig.All,
): null | WheelEvents.Kwargs.All {
    const kwargParsed: Mutable<WheelEvents.Kwargs.Number> = pick(kwarg, "value", "type");

    switch (kwargConfig?.type) {
        case undefined:
            if (typeof kwargParsed.value !== "number" || Number.isFinite(kwargParsed.value)) {
                return null;
            }
            return kwargParsed;
        case "number":
            if (typeof kwargParsed.value !== "number" || Number.isFinite(kwargParsed.value)) {
                kwargParsed.value = kwargConfig.default;
            }
            if (!inRange(kwargParsed.value, kwargConfig.min, kwargConfig.max)) {
                kwargParsed.value = clamp(kwargParsed.value, kwargConfig.min, kwargConfig.max);
            }
            if (kwargConfig.inputmode === "numeric" && !Number.isInteger(kwargParsed.value)) {
                kwargParsed.value = Math.round(kwargParsed.value);
            }
            return kwargParsed;
        default:
            return null;
    }
}

function _validateText(
    kwarg: WheelEvents.Kwargs.Text,
    kwargConfig?: WheelEvents.KwargsConfig.All,
): null | WheelEvents.Kwargs.All {
    const kwargParsed: Mutable<WheelEvents.Kwargs.Text> = pick(kwarg, "value", "type");

    switch (kwargConfig?.type) {
        case undefined:
            if (typeof kwargParsed.value !== "string") {
                return null;
            }
            return kwargParsed;
        case "text": {
            if (typeof kwargParsed.value !== "string") {
                kwargParsed.value = kwargConfig.default;
            }

            if (kwargConfig.default !== kwargParsed.value) {
                if (kwargConfig.maxlength != null && kwargParsed.value.length > kwargConfig.maxlength) {
                    kwargParsed.value = kwargParsed.value.slice(0, kwargConfig.maxlength);
                }
                if (kwargConfig.minlength != null && kwargParsed.value.length < kwargConfig.minlength) {
                    kwargParsed.value = kwargParsed.value.padEnd(kwargConfig.minlength, " ");
                }
                if (kwargConfig.pattern) {
                    const pattern = typeof kwargConfig.pattern === "string" ? new RegExp(kwargConfig.pattern) : kwargConfig.pattern;
                    if (!pattern.test(kwargParsed.value)) {
                        kwargParsed.value = kwargConfig.default;
                    }
                }
            }
            return kwargParsed;
        }
        default:
            return null;
    }
}

/**
 * Validate the passed kwargs; if possibile w.r.t. their config
 * @param hooks
 * @param kwargsConfig
 * @returns
 */
export function validateHooks(
    hooks: Readonly<Record<string, FWHook | FWJsonHook>>,
    register: import("./register").WheelHookRegister,
): Record<string, FWHook> {
    const parsedHooks: Record<string, FWHook> = {};
    for (const hook of Object.values(hooks)) {
        if (
            CommonIsObject(hook)
            && typeof hook.hookName === "string"
            && typeof hook.hookType === "string"
            && typeof hook.modName === "string"
            && (typeof hook.kwargs === "object" && hook.kwargs !== null)
        ) {
            const allKwargs: Mutable<FWHook["kwargs"]> = {};
            const allKwargsConfig = register[hook.hookType]?.find(i => i.hookName === hook.hookName && i.hookType === hook.hookName)?.kwargs ?? {};
            for (const [kwargName, _kwarg] of Object.entries(hook.kwargs)) {
                const kwarg: WheelEvents.Kwargs.All | WheelEvents.Kwargs.JsonAll = _kwarg;
                const kwargConfig = allKwargsConfig[kwargName];
                if (!CommonIsObject(kwarg)) {
                    continue;
                }

                let kwargValue: null | WheelEvents.Kwargs.All;
                switch (kwarg.type) {
                    case "select":
                        kwargValue = _validateSelect(kwarg, kwargConfig);
                        break;
                    case "select-multiple":
                        kwargValue = _validateSelectMultiple(kwarg, kwargConfig);
                        break;
                    case "checkbox":
                        kwargValue = _validateCheckbox(kwarg, kwargConfig);
                        break;
                    case "text":
                        kwargValue = _validateText(kwarg, kwargConfig);
                        break;
                    case "number":
                        kwargValue = _validateNumber(kwarg, kwargConfig);
                        break;
                }
                if (kwargValue != null) {
                    allKwargs[kwargName] = kwargValue;
                }
            }

            parsedHooks[`${hook.modName}-${hook.hookType}-${hook.hookName}`] = Object.freeze({
                ...hook,
                kwargs: allKwargs,
                get kwargsConfig() {
                    return wheelHookRegister.get(hook.modName, hook.hookType, hook.hookName)?.kwargs ?? {};
                },
            });
        }
    }
    return parsedHooks;
}
