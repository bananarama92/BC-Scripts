function _resetKwargElement(elem: Element) {
    if (elem instanceof HTMLInputElement) {
        switch (elem.type) {
            case "checkbox":
                elem.checked = elem.defaultChecked;
                break;
            case "number":
            case "text":
                elem.value = elem.defaultValue;
                break;
        }
    } else if (elem instanceof HTMLSelectElement) {
        for (const option of elem.options) {
            option.selected = option.defaultSelected;
        }
    }
}

/**
 * Reset all kwarg-related `<input>`/`<select>` elements to their default state.
 * @param root The root element containing all kwarg-specific `<input>`/`<select>` elements
 * @param disabled Whether or not the elements must be disabled
 */
export function resetKwargElements(root: Element, disabled: boolean) {
    root.querySelectorAll(".mbs-fwitemset-event-kwarg-config").forEach(e => {
        _resetKwargElement(e);
        e.toggleAttribute("disabled", disabled);
    });
}

/**
 * Update all kwarg-related elements in `root` based on the passed (user-configured) keyword arguments.
 * @param root The root element containing all kwarg-specific `<input>`/`<select>` elements
 * @param kwargs The (user-configured) keyword arguments
 * @param disabled Whether or not the elements must be disabled
 */
export function updateKwargElements(root: Element, kwargs: Map<string, WheelEvents.Kwargs.All>, disabled: boolean) {
    for (const elem of root.querySelectorAll(".mbs-fwitemset-event-kwarg-config")) {
        if (elem instanceof HTMLButtonElement) {
            elem.toggleAttribute("disabled", disabled);
            continue;
        }

        const name = elem.getAttribute("name");
        if (!name) {
            continue;
        }

        const kwarg = kwargs.get(name);
        switch (kwarg?.type) {
            case "checkbox":
                if (elem instanceof HTMLInputElement && elem.type === "checkbox") {
                    elem.checked = kwarg.value;
                }
                break;
            case "text":
                if (elem instanceof HTMLInputElement && elem.type === "text") {
                    elem.value = kwarg.value;
                }
                break;
            case "number":
                if (elem instanceof HTMLInputElement && elem.type === "number") {
                    elem.valueAsNumber = kwarg.value;
                }
                break;
            case "select-multiple":
            case "select":
                if (elem instanceof HTMLSelectElement) {
                    const values: ReadonlySet<string> = kwarg.value instanceof Set ? kwarg.value : new Set([kwarg.value]);
                    for (const option of elem.options) {
                        if (kwarg.state === "none") {
                            option.selected = false;
                        } else if (kwarg.state === "all") {
                            option.selected = true;
                        } else {
                            option.selected = values.has(option.value);
                        }
                    }
                }
                break;
            default:
                _resetKwargElement(elem);
                break;
        }
        elem.toggleAttribute("disabled", disabled);
    }
}
