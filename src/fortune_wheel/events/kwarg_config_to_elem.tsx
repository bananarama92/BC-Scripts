function _getChangeInput(settings: import("../../common_bc").FWSelectedItemSet) {
    return function (this: HTMLInputElement, ev: Event) {
        const parent = this.closest(".mbs-fwitemset-event");
        const hookName = parent?.getAttribute("data-name");
        const hookType = parent?.getAttribute("data-type");
        const modName = parent?.getAttribute("data-mod");
        const hook = settings.activeHooks.get(`${modName}-${hookType}-${hookName}`);
        const errText = this.closest("label")?.querySelector(".mbs-fwitemset-event-error-msg");
        if (!hook || !errText || !hookName) {
            ev.stopImmediatePropagation();
            return;
        }

        if (!this.validity.valid) {
            errText.textContent = ` (${this.validationMessage})`;
            ev.stopImmediatePropagation();
            return;
        } else {
            errText.textContent = "";
        }

        const kwargName = this.name;
        switch (this.type) {
            case "number":
                hook.kwargs.set(kwargName, { type: "number", value: this.valueAsNumber });
                break;
            case "text":
                hook.kwargs.set(kwargName, { type: "text", value: this.value });
                break;
            case "checkbox":
                hook.kwargs.set(kwargName, { type: "checkbox", value: this.checked });
                break;
        }
    };
}

function _getChangeSelect(settings: import("../../common_bc").FWSelectedItemSet) {
    return function (this: HTMLSelectElement, ev: Event) {
        const parent = this.closest(".mbs-fwitemset-event");
        const hookName = parent?.getAttribute("data-name");
        const hookType = parent?.getAttribute("data-type");
        const modName = parent?.getAttribute("data-mod");
        const hook = settings.activeHooks.get(`${modName}-${hookType}-${hookName}`);
        const errText = this.closest("label")?.querySelector(".mbs-fwitemset-event-error-msg");
        if (!errText || !hook || !hookName) {
            ev.stopImmediatePropagation();
            return;
        }

        if (!this.validity.valid) {
            errText.textContent = ` (${this.validationMessage})`;
            ev.stopImmediatePropagation();
            return;
        } else {
            errText.textContent = "";
        }

        const kwargName = this.name;
        hook.kwargs.set(kwargName, { type: "select", value: this.value });
    };
}

function _getChangeSelectMultiple(settings: import("../../common_bc").FWSelectedItemSet) {
    return function (this: HTMLSelectElement, ev: Event) {
        const parent = this.closest(".mbs-fwitemset-event");
        const hookName = parent?.getAttribute("data-name");
        const hookType = parent?.getAttribute("data-type");
        const modName = parent?.getAttribute("data-mod");
        const hook = settings.activeHooks.get(`${modName}-${hookType}-${hookName}`);
        const errText = this.closest("label")?.querySelector(".mbs-fwitemset-event-error-msg");
        if (!hook || !errText || !hookName) {
            ev.stopImmediatePropagation();
            return;
        }

        // For some reason the `required` option fails to be properly honored when `multiple` specified
        if (this.required) {
            const valueMissing = !Array.from(this.selectedOptions).some(o => o.value);
            this.setCustomValidity(valueMissing ? "Please select one or more items in the list" : "");
        }
        if (!this.validity.valid) {
            errText.textContent = ` (${this.validationMessage})`;
            ev.stopImmediatePropagation();
            return;
        } else {
            errText.textContent = "";
        }

        let state: "all" | "some" | "none";
        const value: Set<string> = new Set;
        if (this.selectedOptions.length === 0) {
            state = "none";
        } else if (this.selectedOptions.length === this.options.length) {
            state = "all";
        } else {
            state = "some";
        }

        for (const option of this.selectedOptions) {
            if (option.value) {
                value.add(option.value);
            }
        }

        const kwargName = this.name;
        hook.kwargs.set(kwargName, { type: "select-multiple", state, value });
    };
}

function _parseText(
    idPrefix: string,
    name: string,
    options: WheelEvents.KwargsConfig.Text,
    settings: import("../../common_bc").FWSelectedItemSet,
): HTMLInputElement {
    const children: (string | Element)[] = [options.default];
    let list: undefined | string = undefined;
    if (options.suggestions) {
        children.push(<datalist id={`${idPrefix}-${name}-datalist`}>{options.suggestions.map(i => <option>{i}</option>)}</datalist>);
        list = `${idPrefix}-${name}-datalist`;
    }

    return ElementCreate({
        tag: "input",
        attributes: {
            type: "text",
            minlength: options.minlength,
            maxlength: options.maxlength,
            pattern: options.pattern instanceof RegExp ? options.pattern.source : options.pattern,
            spellcheck: options.spellcheck,
            list,
            size: 0,
            name,
            disabled: true,
        },
        classList: ["mbs-fwitemset-event-kwarg-config"],
        children,
        eventListeners: {
            change: _getChangeInput(settings),
        },
    });
}

function _parseNumber(
    idPrefix: string,
    name: string,
    options: WheelEvents.KwargsConfig.Number,
    settings: import("../../common_bc").FWSelectedItemSet,
): HTMLInputElement {
    const children: (string | Element)[] = [options.default.toString()];
    let list: undefined | string = undefined;
    if (options.suggestions) {
        children.push(<datalist id={`${idPrefix}-${name}-datalist`}>{options.suggestions.map(i => <option>{i}</option>)}</datalist>);
        list = `${idPrefix}-${name}-datalist`;
    }

    const inputmode = (
        Number.isInteger(options.default)
        && Number.isInteger(options.min)
        && Number.isInteger(options.max)
        && (options.step == null || Number.isInteger(options.step))
    ) ? "numeric" : "decimal";

    return ElementCreate({
        tag: "input",
        attributes: {
            type: "number",
            min: options.min.toString(),
            max: options.max.toString(),
            step: options.step == null ? undefined : options.step.toString(),
            inputmode: options.inputmode ?? inputmode,
            list,
            size: 0,
            name,
            disabled: true,
        },
        children,
        classList: ["mbs-fwitemset-event-kwarg-config"],
        eventListeners: {
            change: _getChangeInput(settings),
            wheel(ev) {
                if (this.disabled || document.activeElement !== this) {
                    ev.stopImmediatePropagation();
                    return;
                }

                ev.preventDefault();
                if (ev.deltaY < 0) {
                    this.stepUp();
                } else if (ev.deltaY > 0) {
                    this.stepDown();
                } else {
                    return;
                }
                this.dispatchEvent(new InputEvent("input"));
            },
        },
    });
}

function _parseCheckbox(
    idPrefix: string,
    name: string,
    options: WheelEvents.KwargsConfig.Checkbox,
    settings: import("../../common_bc").FWSelectedItemSet,
): HTMLInputElement {
    return ElementCreate({
        tag: "input",
        attributes: {
            type: "checkbox",
            checked: options.default ? true : undefined,
            name,
            disabled: true,
        },
        classList: ["mbs-fwitemset-event-kwarg-config"],
        eventListeners: {
            change: _getChangeInput(settings),
        },
    });
}

function _selectAll(this: HTMLButtonElement) {
    const selectID = this.getAttribute("aria-controls");
    const select = selectID ? document.getElementById(selectID) : null;
    const selected = this.hasAttribute("data-select-all");
    if (select instanceof HTMLSelectElement) {
        for (const option of select.options) {
            option.selected = selected;
        }
        select.dispatchEvent(new Event("change"));
        select.focus();
    }
}

function _parseSelect(
    idPrefix: string,
    name: string,
    options: WheelEvents.KwargsConfig.Select | WheelEvents.KwargsConfig.SelectMultiple,
    settings: import("../../common_bc").FWSelectedItemSet,
): HTMLDivElement | HTMLSelectElement {
    const children: (string | Element | undefined)[] = [];
    const optGroups: Record<string, HTMLOptionElement[]> = {};
    let defaultCount = 0;
    for (const o of options.options) {
        const optionList = o.group ? (optGroups[o.group] ??= []) : children;
        optionList.push(ElementCreate({
            tag: "option",
            attributes: {
                selected: o.default ? true : undefined,
                value: o.value,
            },
            children: [o.label],
        }));
        if (o.default) {
            defaultCount++;
        }
    }

    for (const [group, list] of Object.entries(optGroups)) {
        children.push(<optgroup label={group}>{list}</optgroup>);
    }

    const extraOptions: Element[] = [];
    switch (options.type) {
        case "select": {
            if (defaultCount > 1) {
                throw new Error(`Keyword argument "${name}" of type "${options.type}" has more than one default value (${defaultCount})`);
            }

            extraOptions.push(
                <option selected aria-hidden="true">--Select an option--</option>,
            );
            break;
        }
        case "select-multiple":
            break;
        default:
            throw new Error;
    }

    // NOTE: falsly values are not automatically converted into attributes, so explicitly assign them afterwards
    extraOptions.forEach(o => o.setAttribute("value", ""));
    children.unshift(
        ...extraOptions,
        <hr />,
    );

    const select = ElementCreate({
        tag: "select",
        attributes: {
            multiple: options.type === "select-multiple" ? true : undefined,
            required: options.required ? true : undefined,
            size: options.type === "select-multiple" ? (options.size ?? 5) : options.size,
            name,
            disabled: true,
            id: `${idPrefix}-select`,
        },
        classList: ["mbs-fwitemset-event-kwarg-config"],
        eventListeners: {
            change: options.type === "select" ? _getChangeSelect(settings) : _getChangeSelectMultiple(settings),
            focus() {
                try {
                    this.showPicker?.();
                } catch {
                    return;
                }
            },
        },
        children,
    });
    if (options.type === "select") {
        return select;
    } else {
        return (
            <div class="mbs-fwitemset-event-multi-select">
                {select}
                {ElementButton.Create(
                    `${idPrefix}-select-all`,
                    _selectAll,
                    { label: "Select all", labelPosition: "center" },
                    { button: {
                        attributes: { "aria-controls": `${idPrefix}-select`, "screen-generated": undefined },
                        dataAttributes: { "selectAll": "" },
                        classList: ["mbs-fwitemset-event-kwarg-config"],
                    }},
                )}
                {ElementButton.Create(
                    `${idPrefix}-select-none`,
                    _selectAll,
                    { label: "Select none", labelPosition: "center" },
                    { button: {
                        attributes: { "aria-controls": `${idPrefix}-select`, "screen-generated": undefined },
                        classList: ["mbs-fwitemset-event-kwarg-config"],
                    }},
                )}
            </div>
        ) as HTMLDivElement;
    }
}

/**
 * Convert the passed keyword argument configurations into a list of menuitem elements.
 * @param idPrefix An {@link HTMLElement.id} prefix for the to-be created elements
 * @param kwargs An object mapping kwarg names to their respective configs
 * @param settings An object representing a currently selected wheel of fortune item set. Used by to-be created event listeners for writing the `<input>`/`<select>` data
 * @returns A `<label>` list with kwarg-specific `<input>` and/or `<select>` elements.
 */
export function createKwargElements(
    idPrefix: string,
    kwargsConfigs: Readonly<Record<string, WheelEvents.KwargsConfig.All>>,
    settings: import("../../common_bc").FWSelectedItemSet,
): HTMLElement[] {
    const ret: HTMLElement[] = [];
    for (const [kwargName, options] of Object.entries(kwargsConfigs)) {
        let elem: HTMLElement;
        switch (options.type) {
            case "text":
                elem = _parseText(`${idPrefix}-${kwargName}`, kwargName, options, settings);
                break;
            case "number":
                elem = _parseNumber(`${idPrefix}-${kwargName}`, kwargName, options, settings);
                break;
            case "checkbox":
                elem = _parseCheckbox(`${idPrefix}-${kwargName}`, kwargName, options, settings);
                break;
            case "select-multiple":
            case "select":
                elem = _parseSelect(`${idPrefix}-${kwargName}`, kwargName, options, settings);
                break;
            default:
                throw new Error(`Unknown options type: ${(options as any).type}`);
        }

        ret.push(
            <label id={`${idPrefix}-${kwargName}`} class="mbs-fwitemset-event-kwargs" role="listitem">
                <span>
                    {options.label}
                    <span class="mbs-fwitemset-event-error-msg" />
                </span>
                {elem}
            </label> as HTMLLabelElement,
        );
    }
    return ret;
}
