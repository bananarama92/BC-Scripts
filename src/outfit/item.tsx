import { clamp, isEqualWith, isEqual } from "lodash-es";

import { waitFor, isInteger, entries } from "../common";
import { bcLoaded } from "../common_bc";

import { getCraft, factory } from "./common";
import type { ItemUpdate, ItemCache } from "./outfit_collection";
import type { OutfitScreen } from "./screen";

let layerDescriptions: TextCache;
waitFor(bcLoaded).then(() => {
    layerDescriptions = new TextCache("Assets/Female3DCG/LayerNames.csv");
});

const root = "mbs-outfit";
export const ID = Object.freeze({
    midBot: `${root}-mid-bot`,

    color: `${root}-color`,
    colorHeader: `${root}-color-header`,
    colorBar: `${root}-color-bar`,
    colorButton: `${root}-color-button`,

    name: `${root}-name`,
    nameHeader: `${root}-name-header`,
    nameInput: `${root}-name-input`,

    description: `${root}-description`,
    descriptionInput: `${root}-description-input`,
    descriptionLength: `${root}-description-length`,

    property: `${root}-property`,
    propertyHeader: `${root}-property-header`,
    propertyDropdown: `${root}-property-dropdown`,

    type: `${root}-type`,
    typeHeader: `${root}-type-header`,
    typeInput: `${root}-type-input`,
    typeButton: `${root}-type-button`,

    layering: `${root}-layering`,
    layeringHeader: `${root}-layering-header`,
    layeringInput: `${root}-layering-input`,
    layeringButton: `${root}-layering-button`,

    difficulty: `${root}-difficulty`,
    difficultyHeader: `${root}-difficulty-header`,
    difficultyInput: `${root}-difficulty-input`,

    buttonBar: `${root}-button-bar`,
    buttonAccept: `${root}-button-accept`,
    buttonSummary: `${root}-button-summary`,
    buttonSummaryInput: `${root}-button-summary-input`,
    buttonSummaryTooltip: `${root}-button-summary-tooltip`,
    buttonCancel: `${root}-button-cancel`,
});

export namespace color {
    function getColors(item: Item): { color: string, name: string, description: string }[] {
        return ItemColorGetColorableLayers(item).map((layer, i) => {
            return {
                color: item.Color?.[i] ?? item.Asset.DefaultColor[i],
                name: layer.Name ?? item.Asset.Name,
                description: layer.Name ? layerDescriptions.get(`${item.Asset.DynamicGroupName}${item.Asset.Name}${layer.Name}`) : item.Asset.Description,
            };
        });
    }

    function getColorBackground(color: string) {
        return color.startsWith("#") ? color : `
            linear-gradient(
                to top left,
                rgba(0,0,0,0) 0%,
                rgba(0,0,0,0) calc(50% - min(0.15dvh, 0.075dvw)),
                rgba(0,0,0,1) 50%,
                rgba(0,0,0,0) calc(50% + min(0.15dvh, 0.075dvw)),
                rgba(0,0,0,0) 100%
            )
        `;
    }

    function onClick(this: HTMLButtonElement, event: MouseEvent, screen: OutfitScreen) {
        if (screen.activeItem?.readonly ?? true) {
            return;
        }
        screen.mode = "color";
    }

    export async function onExit(item: Item, screen: OutfitScreen) {
        const itemCache = screen.activeItem;
        if (!itemCache || itemCache.readonly) {
            return;
        }

        const colors = getColors(item);
        itemCache.newItem.Color = [];
        for (const { color, name, description } of colors) {
            const parent = document.querySelector(`[data-layer="${name}"]`) as HTMLDivElement;
            const [button, span] = [...parent.children] as [HTMLButtonElement, HTMLSpanElement];
            button.style.background = getColorBackground(color);
            span.innerText = `${description}: ${color}`;
            itemCache.newItem.Color.push(color);
        }

        itemCache.update.color = !isEqual(itemCache.newItem.Color, itemCache.item.Color);
        buttonBar.updateTooltip(itemCache.update);
        const elem = document.getElementById(ID.color) as HTMLDivElement;
        elem.style.setProperty("--background-overlay", itemCache.update.color ? "lightgreen" : "");
    }

    export function createElement(screen: OutfitScreen) {
        return (
            <div id={ID.color}>
                <span id={ID.colorHeader}>Color</span>
                <div id={ID.colorBar} />
                <div id={ID.colorButton} class="mbs-outfit-button-div">
                    <button
                        class="mbs-button"
                        style={{ backgroundImage: "url('./Icons/Color.png')" }}
                        onClick={factory(onClick, screen)}
                    />
                    <span class="mbs-outfit-button-tooltip">Edit item colors</span>
                </div>
            </div>
        );
    }

    export function setDefault(itemCache: ItemCache) {
        const disabled = itemCache.readonly;
        const colors = getColors(itemCache.item);

        const button = document.getElementById(ID.colorButton) as HTMLButtonElement;
        button.disabled = disabled;

        const parent = document.getElementById(ID.colorBar) as HTMLDivElement;
        parent.innerHTML = "";
        parent.style.setProperty("--background-overlay", itemCache.update.color ? "lightgreen" : "");
        for (const { color, name, description } of colors) {
            parent.appendChild(
                <div class="mbs-outfit-button-div" data-layer={name}>
                    <button class="mbs-button" disabled={disabled} style={{ background: getColorBackground(color) }} />
                    <span class="mbs-outfit-button-tooltip">{`${description}: ${color}`}</span>
                </div>,
            );
        }
    }
}

export namespace name {
    function onFocus(this: HTMLInputElement) {
        this.select();
    }

    async function onChange(this: HTMLInputElement, event: Event, screen: OutfitScreen) {
        const itemCache = screen.activeItem;
        if (!itemCache || itemCache.readonly) {
            return;
        }

        itemCache.newItem.Craft ??= getCraft(itemCache.newItem);
        if (this.value.length === 0) {
            itemCache.newItem.Craft.Name = this.defaultValue;
        } else {
            itemCache.newItem.Craft.Name = this.value.slice(0, 70);
        }
        itemCache.update.name = itemCache.newItem.Craft.Name !== itemCache.item.Craft?.Name;
        buttonBar.updateTooltip(itemCache.update);
        (this.parentElement as HTMLDivElement).style.setProperty("--background-overlay", itemCache.update.name ? "lightgreen" : "");
    }

    async function onBlur(this: HTMLInputElement) {
        const value = this.value.slice(0, 70);
        if (value !== this.value) {
            this.value = value;
            this.dispatchEvent(new Event("change"));
        }
    }

    export function createElement(screen: OutfitScreen) {
        return (
            <div id={ID.name}>
                <input id={ID.nameInput}
                    type="text"
                    maxLength={70}
                    placeholder="Crafted item name"
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onChange={factory(onChange, screen)}
                />
            </div>
        );
    }

    export function setDefault(itemCache: ItemCache) {
        const elem = document.getElementById(ID.nameInput) as HTMLInputElement;
        elem.value = itemCache.newItem.Craft?.Name ?? "";
        elem.defaultValue = itemCache.item.Craft?.Name ?? "";
        elem.disabled = itemCache.readonly;
        (elem.parentElement as HTMLDivElement).style.setProperty("--background-overlay", itemCache.update.name ? "lightgreen" : "");
    }
}

export namespace layering {
    const characterRefresh: typeof CharacterRefresh = CommonLimitFunction(CharacterRefresh, 100, 100);

    function onFocus(this: HTMLInputElement) {
        this.select();
    }

    async function onInput(this: HTMLInputElement, event: Event, screen: OutfitScreen) {
        const itemCache = screen.activeItem;
        if (!itemCache || itemCache.readonly || Number.isNaN(this.valueAsNumber)) {
            return;
        }

        itemCache.newItem.Property.OverridePriority = clamp(Math.round(this.valueAsNumber), -99, 99);
        characterRefresh(screen.preview, false, false);
    }

    async function onChange(this: HTMLInputElement, event: Event, screen: OutfitScreen) {
        const itemCache = screen.activeItem;
        if (itemCache && !itemCache.readonly) {
            itemCache.update.layering = itemCache.newItem.Property.OverridePriority !== itemCache.item.Property.OverridePriority;
            buttonBar.updateTooltip(itemCache.update);
            (this.parentElement as HTMLDivElement).style.setProperty("--background-overlay", itemCache.update.layering ? "lightgreen" : "");
        }
    }

    async function onBlur(this: HTMLInputElement, event: FocusEvent) {
        ElementNumberInputBlur.bind(this)(event);
    }

    function onClick(this: HTMLButtonElement, event: MouseEvent, screen: OutfitScreen) {
        if (screen.activeItem?.readonly ?? true) {
            return;
        }
        screen.mode = "layering";
    }

    export async function onExit(item: Item, screen: OutfitScreen) {
        if (isInteger(item.Property?.OverridePriority)) {
            const elem = document.getElementById(ID.layeringInput) as HTMLInputElement;
            elem.value = item.Property?.OverridePriority.toString();
        }

        const itemCache = screen.activeItem;
        if (itemCache && !itemCache.readonly) {
            itemCache.update.layering = !isEqual(itemCache.newItem.Property.OverridePriority, itemCache.item.Property.OverridePriority);
            const elem = document.getElementById(ID.layering) as HTMLDivElement;
            elem.style.setProperty("--background-overlay", itemCache.update.property ? "lightgreen" : "");
        }
    }

    export function createElement(screen: OutfitScreen) {
        return (
            <div id={ID.layering} >
                <span id={ID.layeringHeader}>Layering</span>
                <input
                    type="number"
                    id={ID.layeringInput}
                    min={-99}
                    max={99}
                    inputMode="numeric"
                    onFocus={onFocus}
                    onChange={(factory(onChange, screen))}
                    onBlur={onBlur}
                    onInput={factory(onInput, screen)}
                />
                <div id={ID.layeringButton} class="mbs-outfit-button-div">
                    <button
                        class="mbs-button"
                        style={{ backgroundImage: "url('./Icons/Layering.png')" }}
                        onClick={factory(onClick, screen)}
                    />
                    <span class="mbs-outfit-button-tooltip">Edit item layering</span>
                </div>
            </div>
        );
    }

    export function setDefault(itemCache: ItemCache) {
        const elem = document.getElementById(ID.layeringInput) as HTMLInputElement;
        const priority = itemCache.newItem.Property.OverridePriority;
        const priorityDefault = itemCache.item.Property.OverridePriority;
        const priorityFallback = itemCache.asset.DrawingPriority ?? itemCache.group.DrawingPriority;
        elem.value = (isInteger(priority) ? priority : priorityFallback).toString();
        elem.defaultValue = (isInteger(priorityDefault) ? priorityDefault : priorityFallback).toString();
        elem.disabled = itemCache.readonly;
        (elem.parentElement as HTMLDivElement).style.setProperty("--background-overlay", itemCache.update.layering ? "lightgreen" : "");

        const button = document.getElementById(ID.layeringButton) as HTMLButtonElement;
        button.disabled = itemCache.readonly;
    }
}

export namespace description {
    function onInput(this: HTMLTextAreaElement) {
        const sibbling = this.nextSibling as HTMLSpanElement;
        sibbling.innerText = `${this.value.length}/200`;
        sibbling.style.color = this.value.length > 200 ? "red" : "gray";
    }

    async function onBlur(this: HTMLTextAreaElement) {
        const value = this.value.slice(0, 200);
        if (value !== this.value) {
            this.value = value;
            this.dispatchEvent(new Event("change"));
        }
    }

    async function onChange(this: HTMLTextAreaElement, event: Event, screen: OutfitScreen) {
        const itemCache = screen.activeItem;
        if (!itemCache || itemCache.readonly) {
            return;
        }

        itemCache.newItem.Craft ??= getCraft(itemCache.newItem);
        if (this.value.length === 0) {
            itemCache.newItem.Craft.Description = "";
        } else {
            itemCache.newItem.Craft.Description = this.value.slice(0, 200);
        }
        itemCache.update.description = itemCache.newItem.Craft.Description !== itemCache.item.Craft?.Description;
        buttonBar.updateTooltip(itemCache.update);
        (this.parentElement as HTMLDivElement).style.setProperty("--background-overlay", itemCache.update.description ? "lightgreen" : "");
    }

    export function createElement(screen: OutfitScreen) {
        return (
            <div id={ID.description}>
                <textarea
                    id={ID.descriptionInput}
                    maxLength={200}
                    placeholder="Crafted item description"
                    onInput={onInput}
                    onBlur={onBlur}
                    onChange={factory(onChange, screen)}
                />
                <span id={ID.descriptionLength} value="0/200" />
            </div>
        );
    }

    export function setDefault(itemCache: ItemCache) {
        const elem = document.getElementById(ID.descriptionInput) as HTMLInputElement;
        elem.value = itemCache.newItem.Craft?.Description ?? "";
        elem.defaultValue = itemCache.item.Craft?.Description ?? "";
        elem.dispatchEvent(new Event("input"));
        elem.disabled = itemCache.readonly;
        (elem.parentElement as HTMLDivElement).style.setProperty("--background-overlay", itemCache.update.description ? "lightgreen" : "");
    }
}

export namespace type {
    function stringify(item: Item) {
        if (item.Property?.TypeRecord == null) {
            return "-";
        }

        return Object.entries(item.Property.TypeRecord).sort(([k1], [k2]) => {
            return k1.localeCompare(k2);
        }).map(([k, v]) => {
            return `${k}${v}`;
        }).join("-");
    }

    function onClick(this: HTMLButtonElement, event: MouseEvent, screen: OutfitScreen) {
        if (screen.activeItem?.readonly ?? true) {
            return;
        }
        screen.mode = "extended";
    }

    export async function onExit(item: Item, screen: OutfitScreen) {
        const elem = document.getElementById(ID.typeInput) as HTMLInputElement;
        elem.value = stringify(item);

        const itemCache = screen.activeItem;
        if (itemCache && !itemCache.readonly) {
            itemCache.newItem.Property = item.Property as ItemProperties;
            itemCache.update.type = !isEqualWith(
                itemCache.newItem.Property,
                itemCache.item.Property,
                (value, other, key) => key === "OverridePriority" ? true : undefined,
            );
            buttonBar.updateTooltip(itemCache.update);
            (elem.parentElement as HTMLDivElement).style.setProperty("--background-overlay", itemCache.update.type ? "lightgreen" : "");
        }

    }

    export function createElement(screen: OutfitScreen) {
        return (
            <div id={ID.type} >
                <span id={ID.typeHeader}>Type</span>
                <input disabled={true} id={ID.typeInput} placeholder="Extended item type" />
                <div id={ID.typeButton} class="mbs-outfit-button-div">
                    <button
                        class="mbs-button"
                        style={{ backgroundImage: "url('./Icons/Use.png')" }}
                        onClick={factory(onClick, screen)}
                    />
                    <span class="mbs-outfit-button-tooltip">Edit item type</span>
                </div>
            </div>
        );
    }

    export function setDefault(itemCache: ItemCache) {
        const parent = document.getElementById(ID.type) as HTMLDivElement;
        const input = parent.children[1] as HTMLInputElement;
        const button = parent.children[2].children[0] as HTMLButtonElement;
        input.value = stringify(itemCache.newItem);
        input.defaultValue = stringify(itemCache.item);
        button.disabled = !itemCache.newItem.Asset.Archetype || itemCache.readonly;
        input.disabled = true;
        parent.style.setProperty("--background-overlay", itemCache.update.type ? "lightgreen" : "");
    }
}

export namespace property {
    function onWheel(
        this: HTMLButtonElement,
        event: WheelEvent,
        propertyList: readonly CraftingPropertyType[],
    ) {
        if (this.disabled) {
            return;
        }

        const button = this.children[0] as HTMLButtonElement;
        let idx = propertyList.indexOf(button.innerText as CraftingPropertyType);
        if (idx === -1) {
            idx = 0;
        }

        if (event.deltaY < 0) {
            idx = clamp(idx - 1, 0, propertyList.length - 1);
        } else if (event.deltaY > 0) {
            idx = clamp(idx + 1, 0, propertyList.length - 1);
        } else {
            return;
        }
        button.innerText = propertyList[idx];
    }

    function onClick(this: HTMLButtonElement, event: MouseEvent, screen: OutfitScreen) {
        const elem = this.parentElement?.previousSibling as HTMLButtonElement;
        elem.innerText = this.innerText;

        const itemCache = screen.activeItem;
        if (itemCache && !itemCache.readonly) {
            itemCache.newItem.Craft ??= getCraft(itemCache.newItem);
            itemCache.newItem.Craft.Property = this.innerText as CraftingPropertyType;
            itemCache.update.property = itemCache.newItem.Craft.Property !== itemCache.item.Craft?.Property;
            buttonBar.updateTooltip(itemCache.update);
            (this.parentElement?.parentElement as HTMLDivElement).style.setProperty("--background-overlay", itemCache.update.property ? "lightgreen" : "");
        }
    }

    function createDropdown(item: Item, screen: OutfitScreen, disabled: boolean): HTMLDivElement {
        const propertyList: CraftingPropertyType[] = [];
        for (const [prop, func] of CraftingPropertyMap) {
            if (func(item.Asset)) {
                propertyList.push(prop);
            }
        }

        return (
            <div class="mbs-dropdown" id={ID.propertyDropdown}>
                <button class="mbs-button" disabled={disabled} onWheel={factory(onWheel, propertyList)}>
                    {item.Craft?.Property ?? "Default"}
                </button>
                <div class="mbs-dropdown-content">
                    {propertyList.map((prop) => {
                        return <button class="mbs-button mbs-dropdown-button" disabled={disabled} onClick={factory(onClick, screen)}>{prop}</button>;
                    })}
                </div>
            </div>
        ) as HTMLDivElement;
    }

    export function createElement() {
        return (
            <div id={ID.property} >
                <span id={ID.propertyHeader}>Property</span>
                <div id={ID.propertyDropdown} />
            </div>
        );
    }

    export function setDefault(itemCache: ItemCache, screen: OutfitScreen) {
        const elem = document.getElementById(ID.property) as HTMLDivElement;
        elem.replaceChild(createDropdown(itemCache.newItem, screen, itemCache.readonly), elem.children[1]);
        elem.style.setProperty("--background-overlay", itemCache.update.property ? "lightgreen" : "");
    }
}

export namespace difficulty {
    async function onChange(this: HTMLInputElement, event: Event, screen: OutfitScreen) {
        const itemCache = screen.activeItem;
        if (!itemCache || itemCache.readonly || Number.isNaN(this.valueAsNumber)) {
            return;
        }

        itemCache.newItem.Difficulty = clamp(
            Math.round(this.valueAsNumber),
            -10,
            Number.parseInt(this.max, 10) || 0,
        );

        itemCache.update.difficulty = itemCache.newItem.Difficulty !== itemCache.item.Difficulty;
        buttonBar.updateTooltip(itemCache.update);
        (this.parentElement as HTMLDivElement).style.setProperty("--background-overlay", itemCache.update.difficulty ? "lightgreen" : "");
    }

    function onFocus(this: HTMLInputElement, event: FocusEvent, screen: OutfitScreen) {
        this.select();
        const item = screen.activeItem?.newItem;
        if (item) {
            this.max = (14 + item.Asset.Difficulty + (item.Craft?.Property === "Secure" ? 4 : 0)).toString();
        }
    }

    async function onBlur(this: HTMLInputElement, event: FocusEvent) {
        return ElementNumberInputBlur.bind(this)(event);
    }

    export function createElement(screen: OutfitScreen) {
        return (
            <div id={ID.difficulty} >
                <span id={ID.difficultyHeader}>Difficulty</span>
                <input
                    type="number"
                    id={ID.difficultyInput}
                    min={-10}
                    max={14}
                    inputMode="numeric"
                    onFocus={factory(onFocus, screen)}
                    onBlur={onBlur}
                    onChange={factory(onChange, screen)}
                />
            </div>
        );
    }

    export function setDefault(itemCache: ItemCache) {
        const elem = document.getElementById(ID.difficultyInput) as HTMLInputElement;
        elem.value = itemCache.newItem.Difficulty.toString();
        elem.defaultValue = itemCache.item.Difficulty.toString();
        elem.disabled = !itemCache.newItem.Asset.AllowTighten || itemCache.readonly;
        if (elem.disabled) {
            elem.min = elem.max = elem.value;
        } else {
            elem.min = "-10";
            elem.max = (10 + 4 + itemCache.newItem.Asset.Difficulty + (itemCache.newItem.Craft?.Property === "Secure" ? 4 : 0)).toString();
        }
        (elem.parentElement as HTMLDivElement).style.setProperty("--background-overlay", itemCache.update.difficulty ? "lightgreen" : "");
    }
}

export namespace buttonBar {
    function onClick(this: HTMLButtonElement, event: MouseEvent, screen: OutfitScreen, cancel: boolean) {
        const itemCache = screen.activeItem;
        if (!itemCache) {
            return;
        }
        screen.data.applyItemCache(itemCache, { cancel });

        updateTooltip({});
        const root = document.getElementById(ID.midBot) as HTMLDivElement;
        for (const c of root.children as Iterable<HTMLDivElement>) {
            c.style.setProperty("--background-overlay", "");
        }
    }

    export function updateTooltip(update: ItemUpdate, readonly?: boolean) {
        const updateEntries = entries(update).sort(([k1], [k2]) => k1.localeCompare(k2)).filter(([_, v]) => v);
        const button = document.getElementById(ID.buttonSummaryInput) as HTMLButtonElement;
        button.innerText = `${updateEntries.length} unsaved changes`;
        button.style.backgroundColor = updateEntries.length ? "lightgreen" : "";
        if (readonly !== undefined) {
            button.disabled = readonly;
        }

        const tooltip = document.getElementById(ID.buttonSummaryTooltip) as HTMLUListElement;
        tooltip.style.visibility = updateEntries.length ? "" : "hidden";
        tooltip.innerHTML = "";
        updateEntries.forEach(([k]) => tooltip.appendChild(<li>{k}</li>));
    }

    export function createElement(screen: OutfitScreen) {
        return (
            <div id={ID.buttonBar} >
                <div id={ID.buttonAccept} class="mbs-outfit-button-div">
                    <button
                        class="mbs-button"
                        style={{ backgroundImage: "url('./Icons/Accept.png')" }}
                        onClick={factory(onClick, screen, false)}
                    />
                    <span class="mbs-outfit-button-tooltip">Save item changes</span>
                </div>
                <div id={ID.buttonSummary} class="mbs-outfit-button-div">
                    <button
                        class="mbs-button"
                        disabled={true}
                        id={ID.buttonSummaryInput}
                    >0 unsaved changes</button>
                    <ul class="mbs-outfit-button-tooltip" id={ID.buttonSummaryTooltip} />
                </div>
                <div id={ID.buttonCancel} class="mbs-outfit-button-div">
                    <button
                        class="mbs-button"
                        style={{ backgroundImage: "url('./Icons/Cancel.png')" }}
                        onClick={factory(onClick, screen, true)}
                    />
                    <span
                        class="mbs-outfit-button-tooltip"
                        style={{ left: "100%", transform: "translateX(-100%)" }}
                    >Revert item changes</span>
                </div>
            </div>
        );
    }
}
