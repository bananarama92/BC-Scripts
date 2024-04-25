import { isArray, validateInt } from "../../common";

function _validateNumber(
    kwarg: WheelEvents.KwargsConfig.Number,
    name: string,
    errPrefix: string,
) {
    if (typeof kwarg.default !== "number") {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.default" type: "${typeof (kwarg as any).default}"`);
    } else if (!Number.isFinite(kwarg.default)) {
        throw new Error(`${errPrefix}: Invalid kwarg "${name}.default" value: "${(kwarg as any).default}"`);
    }
    if (typeof kwarg.min !== "number") {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.min" type: "${typeof (kwarg as any).min}"`);
    } else if (!Number.isFinite(kwarg.min)) {
        throw new Error(`${errPrefix}: Invalid kwarg "${name}.min" value: "${(kwarg as any).min}"`);
    }
    if (typeof kwarg.max !== "number") {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.max" type: "${typeof (kwarg as any).max}"`);
    } else if (!Number.isFinite(kwarg.max)) {
        throw new Error(`${errPrefix}: Invalid kwarg "${name}.max" value: "${(kwarg as any).max}"`);
    }
    if (kwarg.step != null) {
        if (typeof kwarg.step !== "number") {
            throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.step" type: "${typeof (kwarg as any).step}"`);
        } else if (!Number.isFinite(kwarg.step)) {
            throw new Error(`${errPrefix}: Invalid kwarg "${name}.step" value: "${(kwarg as any).step}"`);
        }
    }
    if (kwarg.inputmode != null && kwarg.inputmode != "numeric" && kwarg.inputmode != "decimal") {
        throw new Error(`${errPrefix}: Invalid kwarg "${name}.inputmode" value: "${kwarg.inputmode}"`);
    }

    if (kwarg.suggestions != null) {
        if (!isArray(kwarg.suggestions)) {
            throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.suggestions" type: "${typeof (kwarg as any).suggestions}"`);
        } else if (!kwarg.suggestions.every(i => typeof i === "number")) {
            throw new Error(`${errPrefix}: Invalid kwarg "${name}.suggestions" value: all array member must be numbers`);
        } else if (!kwarg.suggestions.every(i => (i >= kwarg.min) && (i <= kwarg.max))) {
            throw new RangeError(`${errPrefix}: Invalid kwarg "${name}.suggestions" value: all array member must lie in the [${name}.min, ${name}.max] interval`);
        }
    }

    if (kwarg.max < kwarg.min) {
        throw new Error(`${errPrefix}: Kwarg "${name}.min" cannot be larger than "${name}.max"`);
    }
    if (kwarg.default < kwarg.min) {
        throw new Error(`${errPrefix}: Kwarg "${name}.min" cannot be larger than "${name}.default"`);
    }
    if (kwarg.max < kwarg.default) {
        throw new Error(`${errPrefix}: Kwarg "${name}.default" cannot be larger than "${name}.max"`);
    }
}

function _validateText(
    kwarg: WheelEvents.KwargsConfig.Text,
    name: string,
    errPrefix: string,
) {
    if (typeof kwarg.default !== "string") {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.default" type: "${typeof (kwarg as any).default}"`);
    }
    if (kwarg.minlength != null) {
        validateInt(kwarg.minlength, "kwarg.minlength", 0, undefined, errPrefix);
    }
    if (kwarg.maxlength != null) {
        validateInt(kwarg.maxlength, "kwarg.maxlength", 1, undefined, errPrefix);
    }
    if (kwarg.spellcheck != null && typeof kwarg.spellcheck !== "boolean") {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.spellcheck" type: "${typeof (kwarg as any).spellcheck}"`);
    }
    if (kwarg.pattern != null && typeof kwarg.pattern !== "string" && !(kwarg.pattern instanceof RegExp)) {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.pattern" type: "${typeof (kwarg as any).pattern}"`);
    }
    if (kwarg.suggestions != null && !isArray(kwarg.suggestions)) {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.suggestions" type: "${typeof (kwarg as any).suggestions}"`);
    } else if (!(kwarg.suggestions ?? []).every(i => typeof i === "string")) {
        throw new Error(`${errPrefix}: Invalid kwarg "${name}.suggestions" value: all array member must be strings`);
    }

    if (kwarg.minlength != null && kwarg.maxlength != null && kwarg.minlength > kwarg.maxlength) {
        throw new Error(`${errPrefix}: Kwarg "${name}.minlength" cannot be larger than "${name}.maxlength"`);
    }
}

function _validateCheckbox(
    kwarg: WheelEvents.KwargsConfig.Checkbox,
    name: string,
    errPrefix: string,
) {
    if (typeof kwarg.default !== "boolean") {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.default" type: "${typeof (kwarg as any).default}"`);
    }
}

function _validateSelect(
    kwarg: WheelEvents.KwargsConfig.Select | WheelEvents.KwargsConfig.SelectMultiple,
    name: string,
    errPrefix: string,
) {
    if (kwarg.size != null) {
        validateInt(kwarg.size, "kwarg.size", 0, undefined, errPrefix);
    }
    if (kwarg.required != null && typeof kwarg.required !== "boolean") {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.required" type: "${typeof (kwarg as any).required}"`);
    }

    if (!isArray(kwarg.options)) {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.options" type: "${typeof (kwarg as any).options}"`);
    } else if (kwarg.options.length === 0) {
        throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.options" value: array must be of length >=1`);
    }

    let defaultCount = 0;
    for (const option of kwarg.options) {
        if (!CommonIsObject(option)) {
            throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.options" value: array member is of invalid type "${typeof (kwarg as any).options}"`);
        }

        if (typeof option.label !== "string") {
            throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.options" value: array member labels must be strings`);
        } else if (!option.label) {
            throw new Error(`${errPrefix}: Invalid kwarg "${name}.options" value: array member labels must be non-empty strings`);
        }

        if (option.value != null && typeof option.value !== "string") {
            throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.options" value: array member values must be nullish or strings`);
        }

        if (option.default) {
            defaultCount++;
        }
        if (option.default != null && typeof option.default !== "boolean") {
            throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.options" value: array member defaults must nullish or booleans`);
        }

        if (option.group != null && typeof option.group !== "string") {
            throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.options" value: array member groups must nullish or booleans`);
        }
    }

    if (kwarg.type === "select" && defaultCount > 1) {
        throw new Error(`${errPrefix}: Invalid kwarg "${name}.options" value: array cannot have more than one default option`);
    }
}

/**
 * Validate the passed keyword argument config(s), raising if a validation error is encountered.
 * @param kwargs An object mapping kwarg names to their respective configs
 * @param errPrefix A prefix used in the (potentially) to-be raised errors
 */
export function validateKwargsConfig(
    kwargs: Readonly<Record<string, WheelEvents.KwargsConfig.All>>,
    errPrefix: string,
): void {
    for (const [name, kwarg] of Object.entries(kwargs)) {
        if (!name) {
            throw new Error(`${errPrefix}: Invalid kwarg "${name}" name; string must be non-empty`);
        }

        if (!CommonIsObject(kwarg)) {
            throw new TypeError(`${errPrefix}: Invalid kwarg"${name}" type: "${typeof kwarg}"`);
        }

        if (typeof kwarg.type !== "string") {
            throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.type" type: "${typeof (kwarg as any).type}"`);
        }

        if (typeof kwarg.label !== "string") {
            throw new TypeError(`${errPrefix}: Invalid kwarg "${name}.label" type: "${typeof (kwarg as any).label}"`);
        } else if (!kwarg.label) {
            throw new Error(`${errPrefix}: Invalid kwarg "${name}.label" value: string must be non-empty`);
        }

        switch (kwarg.type) {
            case "number":
                _validateNumber(kwarg, name, errPrefix);
                break;
            case "text":
                _validateText(kwarg, name, errPrefix);
                break;
            case "checkbox":
                _validateCheckbox(kwarg, name, errPrefix);
                break;
            case "select":
            case "select-multiple":
                _validateSelect(kwarg, name, errPrefix);
                break;
            default:
                throw new Error(`${errPrefix}: Unknown "${name}" kwarg.type value: "${(kwarg as any).type}"`);
        }
    }
}
