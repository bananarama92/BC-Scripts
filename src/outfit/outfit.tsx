import { cloneDeepWith } from "lodash-es";

import { factory } from "./common";
import { FILE_REGEX, FILE_REGEX_INVERT, FILE_SEP, MBSItem } from "./outfit_collection";
import { name, property, color, description, layering, type, difficulty, buttonBar, ID as itemID } from "./item";
import type { OutfitScreen } from "./screen";

const root = "mbs-outfit";
export const ID = Object.freeze({
    ...itemID,
    midTop: `${root}-mid-top`,

    midTopBar: `${root}-mid-top-bar`,
    outfitExport: `${root}-outfit-export`,
    outfitName: `${root}-outfit-name`,
    outfitAccept: `${root}-outfit-accept`,
    outfitCancel: `${root}-outfit-cancel`,
    outfitDelete: `${root}-outfit-delete`,

    midTopBar2: `${root}-mid-top-bar2`,
    directoryName: `${root}-mid-directory-name`,
    directoryExport: `${root}-mid-directory-export`,
    directoryAddFile: `${root}-mid-directory-add-file`,
    directoryAddDir: `${root}-mid-directory-add-dir`,
    deleteDirectory: `${root}-mid-directory-delete`,

    outfitContainer: `${root}-outfit-container`,
});

export function itemClick(this: HTMLDivElement, event: Event, item: MBSItem, screen: OutfitScreen) {
    if (!screen.activeOutfit) {
        return;
    }

    if (screen.activeItem && screen.activeItem.group.Name === item.Asset.Group.Name) {
        screen.activeItem = null;
        return;
    }

    screen.activeItem = screen.activeOutfit.newOutfit?.[item.Asset.Group.Name] ?? {
        outfit: screen.activeOutfit.outfit,
        item: item,
        newItem: cloneDeepWith(item, (value, key) => key === "Asset" ? value : undefined),
        update: {},
        get updateCount() { return Object.values(this.update).length; },
        get asset() { return this.item.Asset; },
        get group() { return this.item.Asset.Group; },
        element: this,
        readonly: screen.activeOutfit.outfit.readonly.has("outfit"),
    };

    color.setDefault(screen.activeItem);
    name.setDefault(screen.activeItem);
    description.setDefault(screen.activeItem);
    property.setDefault(screen.activeItem, screen);
    type.setDefault(screen.activeItem);
    layering.setDefault(screen.activeItem);
    difficulty.setDefault(screen.activeItem);
    buttonBar.updateTooltip(screen.activeItem.update, screen.activeItem.readonly);
}

function confirmFile(this: HTMLButtonElement, event: MouseEvent, screen: OutfitScreen, cancel: boolean) {
    const outfitCache = screen.activeOutfit;
    const itemCache = screen.activeItem;
    if (!outfitCache) {
        return;
    }

    for (const { element } of Object.values(outfitCache.newOutfit ?? {})) {
        element.style.setProperty("--background-overlay", "");
    }

    if (itemCache) {
        buttonBar.updateTooltip({});
        const itemRoot = document.getElementById(ID.midBot) as HTMLDivElement;
        for (const c of itemRoot.children as Iterable<HTMLDivElement>) {
            c.style.setProperty("--background-overlay", "");
        }
    }

    screen.data.applyOutfitCache(outfitCache, { cancel, resetItem: itemCache });
}

async function exportFile(this: HTMLButtonElement, event: MouseEvent, screen: OutfitScreen) {
    if (!screen.activeOutfit) {
        alert("No active outfit");
        return;
    }

    const base64Outfit = LZString.compressToBase64(JSON.stringify(screen.activeOutfit.outfit));
    navigator.clipboard.writeText(base64Outfit);
    alert(`Outfit "${screen.activeOutfit.outfit.name}" copied to clipboard`);
}

async function deleteFile(this: HTMLButtonElement, event: Event, screen: OutfitScreen) {
    if (!screen.activeOutfit) {
        return;
    }

    screen.activeOutfit.deleteOutfit = true;
    screen.activeOutfit.update.add("delete");
    screen.activeOutfit = null;
}

async function renameFile(this: HTMLInputElement, event: Event, screen: OutfitScreen) {
    if (!screen.activeOutfit) {
        return;
    }

    const value = this.value.replace(FILE_REGEX_INVERT, "") || this.defaultValue;
    if (value !== this.value) {
        this.value = value;
    }

    if (value !== this.defaultValue) {
        screen.activeOutfit.newName = value;
        screen.activeOutfit.update.add("name");
    } else {
        delete screen.activeOutfit.newName;
        screen.activeOutfit.update.delete("name");
    }
}

async function renameDirectory(this: HTMLInputElement, event: Event, screen: OutfitScreen) {
    if (!screen.activeDirectory || screen.activeDirectory.deleteDirectory) {
        return;
    }

    const path = (screen.activeDirectory.element.dataset.path || "").split("/").filter(Boolean);
    if (!path.length) {
        return;
    }

    const name = this.value.replace(FILE_REGEX_INVERT, "") || this.defaultValue;
    path[path.length - 1] = name;

    screen.activeDirectory.newName = name;
    screen.activeDirectory.update.add("name");
    screen.activeDirectory.element.style.setProperty("--background-overlay", "lightgreen");
    const spanElem = screen.activeDirectory.element.children[0].children[1] as HTMLSpanElement;
    spanElem.innerText = name;

    const childElements = screen.activeDirectory.element.querySelectorAll("[data-id]") as NodeListOf<HTMLDivElement>;
    for (const e of childElements) {
        const id = Number.parseInt(e.dataset.id as string, 10);
        const outfit = screen.data.outfitsFlat.get(id);
        if (!outfit) {
            continue;
        }

        const outfitCache = screen.data.cache.get(id) ?? {
            outfit,
            update: new Set(),
            get updateCount() { return this.update.size; },
            element: e,
            readonly: outfit.readonly,
        };
        outfitCache.update.add("path");
        outfitCache.newPath = [...path, ...outfit.path.slice(path.length)];
        screen.data.cache.set(id, outfitCache);
    }

    const downloadButton = document.getElementById(ID.directoryExport) as HTMLDivElement;
    const anchor = downloadButton.children[0].children[1] as HTMLAnchorElement;
    anchor.innerText = `${name}.json`;
}

async function downloadDirectory(this: HTMLButtonElement, event: Event, screen: OutfitScreen) {
    if (!screen.activeDirectory) {
        return;
    }

    const elem = screen.activeDirectory.element;
    const path = (elem.dataset.path ?? "").split(FILE_SEP).filter(Boolean);
    if (!path.length) {
        return;
    }

    const json = new Blob(
        [JSON.stringify(screen.data.toJSON({ paths: [path] }), null, 4)],
        { type: "application/json" },
    );

    const anchor = this.children[1] as HTMLAnchorElement;
    anchor.href = URL.createObjectURL(json);
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    anchor.href = "";
}

async function deleteDirectory(this: HTMLButtonElement, event: Event, screen: OutfitScreen) {
    if (!screen.activeDirectory) {
        return;
    }
    screen.activeDirectory.update.add("delete");
    screen.activeDirectory.deleteDirectory = true;

    const elem = screen.activeDirectory.element.querySelectorAll("[data-id]") as NodeListOf<HTMLDivElement>;
    for (const e of elem) {
        const id = Number.parseInt(e.dataset.id as string, 10);
        const outfit = screen.data.outfitsFlat.get(id);
        if (!outfit) {
            continue;
        }

        const outfitCache = screen.data.cache.get(id) ?? {
            outfit,
            update: new Set(),
            get updateCount() { return this.update.size; },
            element: e,
            readonly: outfit.readonly,
        };
        outfitCache.update.add("delete");
        outfitCache.deleteOutfit = true;
        screen.data.cache.set(id, outfitCache);
    }

    screen.activeDirectory = null;
}

async function addDirectory(this: HTMLButtonElement, event: Event, screen: OutfitScreen) {

}

async function addFile(this: HTMLInputElement, event: Event, screen: OutfitScreen) {

}

export function createElement(screen: OutfitScreen) {
    return [
        <div id={ID.midTopBar}>
            <input
                type="text"
                id={ID.outfitName}
                placeholder="Outfit name"
                pattern={FILE_REGEX.toString()}
                onChange={factory(renameFile, screen)}
            />

            <div id={ID.outfitExport} class="mbs-outfit-button-div">
                <button class="mbs-button" onClick={factory(exportFile, screen)}>Export outfit</button>
                <span class="mbs-outfit-button-tooltip">Export as base64-encoded outfit code</span>
            </div>

            <div id={ID.outfitAccept} class="mbs-outfit-button-div">
                <button
                    class="mbs-button"
                    onClick={factory(confirmFile, screen, false)}
                    style={{ backgroundImage: "url('./Icons/Accept.png')" }}
                />
                <span class="mbs-outfit-button-tooltip">Save outfit changes</span>
            </div>

            <div id={ID.outfitCancel} class="mbs-outfit-button-div">
                <button
                    class="mbs-button"
                    onClick={factory(confirmFile, screen, true)}
                    style={{ backgroundImage: "url('./Icons/Cancel.png')" }}
                />
                <span class="mbs-outfit-button-tooltip">Revert outfit changes</span>
            </div>

            <div id={ID.outfitDelete} class="mbs-outfit-button-div">
                <button
                    class="mbs-button"
                    onClick={factory(deleteFile, screen)}
                    style={{ backgroundImage: "url('./Icons/Trash.png')" }}
                />
                <span class="mbs-outfit-button-tooltip">Delete outfit</span>
            </div>
        </div>,
        <div id={ID.midTopBar2}>
            <input
                type="text"
                id={ID.directoryName}
                placeholder="Directory name"
                pattern={FILE_REGEX.toString()}
                onChange={factory(renameDirectory, screen)}
            />

            <div id={ID.directoryExport} class="mbs-outfit-button-div">
                <button class="mbs-button" onClick={factory(downloadDirectory, screen)}>
                    Download outfits
                    <a style={{ display: "none" }} />
                </button>
                <span class="mbs-outfit-button-tooltip">Export JSON</span>
            </div>

            <div id={ID.directoryAddFile} class="mbs-outfit-button-div">
                <button class="mbs-button" onClick={factory(addFile, screen)}>Add outfit</button>
                <span class="mbs-outfit-button-tooltip">Add outfit</span>
            </div>

            <div id={ID.directoryAddDir} class="mbs-outfit-button-div">
                <button class="mbs-button" onClick={factory(addDirectory, screen)}>Add directory</button>
                <span class="mbs-outfit-button-tooltip">Add sub-directory</span>
            </div>

            <div id={ID.deleteDirectory} class="mbs-outfit-button-div">
                <button
                    class="mbs-button"
                    onClick={factory(deleteDirectory, screen)}
                    style={{ backgroundImage: "url('./Icons/Trash.png')" }}
                />
                <span class="mbs-outfit-button-tooltip">Delete directory</span>
            </div>
        </div>,
    ] as HTMLDivElement[];
}
