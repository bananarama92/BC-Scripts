import { zip } from "lodash-es";

import { fromItemBundles } from "../fortune_wheel";

import { factory } from "./common";
import { Outfit, OutfitCollection, FILE_SEP, FILE_REGEX, FILE_REGEX_INVERT } from "./outfit_collection";
import * as outfit2 from "./outfit";
import type { OutfitScreen } from "./screen";

const root = "mbs-outfit";
export const ID = Object.freeze({
    ...outfit2.ID,
    exit: `${root}-exit`,
    exitButton: `${root}-exit-button`,
    accept: `${root}-accept`,
    acceptButton: `${root}-accept-button`,
    cancel: `${root}-cancel`,
    cancelButton: `${root}-cancel-button`,
    searchBar: `${root}-search-bar`,
    searchInput: `${root}-search-input`,
    directoryContainer: `${root}-directory-container`,
});

function directoryClick(this: HTMLImageElement, event?: MouseEvent, forceOn?: boolean) {
    const parent = this.parentElement as HTMLDivElement;
    const grandParent = parent.parentElement as HTMLDivElement;

    let display: string;
    switch (forceOn) {
        case true:
            display = "";
            break;
        case false:
            display = "none";
            break;
        default:
            display = grandParent.dataset.active ? "none" : "";
            break;
    }

    if (display === "none") {
        grandParent.dataset.active = "";
        this.src = "./Icons/Next.png";
    } else {
        grandParent.dataset.active = "true";
        this.src = "./Icons/Down.png";
    }

    let sibbling = parent.nextSibling as null | HTMLDivElement;
    while (sibbling) {
        sibbling.style.display = display;
        sibbling = sibbling.nextSibling as null | HTMLDivElement;
    }
}

function directoryClickBob(this: HTMLSpanElement, event: Event, screen: OutfitScreen) {
    screen.activeOutfit = null;
    const downloadButton = document.getElementById(ID.directoryExport) as HTMLDivElement;
    const anchor = downloadButton.children[0].children[1] as HTMLAnchorElement;

    const parent = this.parentElement?.parentElement as HTMLDivElement;
    const name = (parent.dataset.path ?? "").split("/").filter(Boolean).at(-1);
    anchor.download = `${name}.json`;

    screen.activeDirectory = {
        element: this.parentElement?.parentElement as HTMLDivElement,
        update: new Set(),
        get updateCount() { return this.update.size; },
    };
}

export function fileClick(this: HTMLDivElement, event: Event, outfit: Outfit, screen: OutfitScreen) {
    screen.activeDirectory = null;
    if (screen.activeOutfit && screen.activeOutfit.outfit.id === outfit.id) {
        screen.activeOutfit = null;
        return;
    }

    const outfitContainer = document.getElementById(ID.outfitContainer) as HTMLDivElement;
    outfitContainer.innerHTML = "";
    Object.values(outfit.outfit).forEach((item, j) => {
        outfitContainer.appendChild(
            <div class="mbs-outfit-item" onClick={factory(outfit2.itemClick, item, screen)}>
                <span style={{ alignSelf: "left" }} class="mbs-outfit-outfit-index">{j + 1}</span>
                <span class="mbs-outfit-outfit-group">
                    {item.Asset.Group.Description}<br/>
                    <i style={{ fontSize: "min(1.5dvh, 0.75dvw)", lineHeight: "min(1.5dvh, 0.75dvw)" }}>{`(${item.Asset.Group.Name})`}</i>
                </span>
                <span class="mbs-outfit-outfit-asset">
                    {item.Asset.Description}<br/>
                    <i style={{ fontSize: "min(1.5dvh, 0.75dvw)", lineHeight: "min(1.5dvh, 0.75dvw)" }}>{`(${item.Asset.Name})`}</i>
                </span>
                <img class="mbs-outfit-outfit-icon" src={`./Assets/Female3DCG/${item.Asset.DynamicGroupName}/Preview/${item.Asset.Name}.png`}/>
            </div>,
        );
    });

    screen.activeOutfit = screen.data.cache.get(outfit.id) ?? {
        outfit,
        element: this,
        update: new Set(),
        get updateCount() { return this.update.size; },
        readonly: outfit.readonly,
    };

    const nameInput = document.getElementById(ID.outfitName) as HTMLInputElement;
    nameInput.defaultValue = screen.activeOutfit.outfit.name;
    nameInput.value = screen.activeOutfit.newName ?? screen.activeOutfit.outfit.name;
}

export function createElementSideBar(data: OutfitCollection, screen: OutfitScreen): HTMLDivElement {
    const bob = Array.from(data.outfitsFlat.values()).sort((outfit1, outfit2) => {
        const iterator = zip(
            [outfit1.root, ...outfit1.path, outfit1.name],
            [outfit2.root, ...outfit2.path, outfit2.name],
        );
        for (const [i, j] of iterator) {
            if (i === undefined) {
                return -1;
            } else if (j === undefined) {
                return 1;
            }

            const equivalency = i.localeCompare(j);
            if (equivalency) {
                return equivalency;
            }
        }
        return 0;
    });

    const ret = <div id={ID.directoryContainer} /> as HTMLDivElement;
    const visited: Record<string, HTMLDivElement> = {};
    for (const outfit of bob) {
        let path = "/";
        let indent = 0;
        let root: null | HTMLDivElement = null;
        for (const p of [outfit.root, ...outfit.path]) {
            indent++;
            path += `${p}/`;
            const newRoot = visited[path] ??= (
                <div class="mbs-outfit-path-node" data-path={path} data-active={true}>
                    <div
                        style={{ gridTemplateColumns: `min(${2.5 * indent}dvh, ${1.25 * indent}dvw) auto` }}
                        class="mbs-outfit-pair"
                    >
                        <img onClick={directoryClick} src="./Icons/Down.png" />
                        <span onClick={factory(directoryClickBob, screen)}>{p}</span>
                    </div>
                </div> as HTMLDivElement
            );

            (root ?? ret).appendChild(newRoot);
            root = newRoot;
        }

        path += outfit.name;
        indent++;
        const newRoot = visited[path] = (
            <div
                data-path={path}
                data-id={outfit.id}
                style={{ gridTemplateColumns: `min(${2.5 * indent}dvh, ${1.25 * indent}dvw) auto` }}
                class="mbs-outfit-pair"
                onClick={factory(fileClick, outfit, screen)}
            >
                <img src="./Icons/Dress.png" />
                <span>{outfit.name}</span>
            </div> as HTMLDivElement
        );
        (root ?? ret).appendChild(newRoot);
    }

    const dirs = Array.from(ret.getElementsByClassName("mbs-outfit-pair")) as HTMLDivElement[];
    for (const [i, elem] of dirs.entries()) {
        elem.classList.add(i % 2  ? "gray" : "lightgray");
    }
    return ret;
}

export function updateSideBarColors(root: Pick<HTMLElement, "getElementsByClassName"> = document) {
    const dirs = Array.from(root.getElementsByClassName("mbs-outfit-pair")) as HTMLDivElement[];
    for (const [i, elem] of dirs.entries()) {
        const [newColor, oldColor] = i % 2 ? ["gray", "lightgray"] : ["lightgray", "gray"];
        elem.classList.remove(oldColor);
        elem.classList.add(newColor);
    }
}

function searchInput(this: HTMLInputElement) {
    const value = this.value.replace("/\\", "/");
    const elemList = document.querySelectorAll("[data-path]") as NodeListOf<HTMLDivElement>;
    for (const elem of elemList) {
        const path = elem.dataset.path as string;
        if (path.endsWith("/")) {
            directoryClick.bind(elem.children[0].children[0] as HTMLImageElement)(undefined, path.includes(value));
        }
    }
}

export function createSearchBar(screen: OutfitScreen): HTMLDivElement {
    return (
        <div id={ID.searchBar}>
            <input type="search" id={ID.searchInput} placeholder="Search" onInput={searchInput} />
            <div id={ID.accept} class="mbs-button-div">
                <button
                    class="mbs-button"
                    id={ID.acceptButton}
                    style={{ backgroundImage: "url('./Icons/Accept.png')" }}
                    onClick={() => screen.data.applyCache({ cancel: false, resetItem: screen.activeItem, resetOutfit: screen.activeOutfit })}
                />
                <div class="mbs-button-tooltip">Save changes</div>
            </div>
            <div id={ID.cancel} class="mbs-button-div">
                <button
                    class="mbs-button"
                    id={ID.cancelButton}
                    style={{ backgroundImage: "url('./Icons/Cancel.png')" }}
                    onClick={() => screen.data.applyCache({ cancel: true, resetItem: screen.activeItem, resetOutfit: screen.activeOutfit })}
                />
                <div class="mbs-button-tooltip">Cancel changes</div>
            </div>
        </div>
    ) as HTMLDivElement;
}

function onClick(this: HTMLButtonElement, event: MouseEvent, screen: OutfitScreen) {
    screen.data.applyCache({ cancel: false, resetItem: screen.activeItem, resetOutfit: screen.activeOutfit });
    screen.activeOutfit = null;
    screen.exit();
}

export function createElementTopBar(screen: OutfitScreen): HTMLDivElement {
    return (
        <div id={ID.exit} class="mbs-button-div">
            <button
                class="mbs-button"
                id={ID.exitButton}
                style={{ backgroundImage: "url('./Icons/Exit.png')" }}
                onClick={factory(onClick, screen)}
            />
            <div class="mbs-button-tooltip" style={{ justifySelf: "right" }}>Save and exit</div>
        </div>
    ) as HTMLDivElement;
}

function addDirectory(this: HTMLButtonElement, event: Event, screen: OutfitScreen) {
    if (!screen.activeDirectory) {
        return;
    }

    const dirName = prompt("Enter directory name")?.trim().replace(FILE_REGEX_INVERT, "");
    if (!dirName) {
        return;
    }

    const path = `${screen.activeDirectory.element.dataset.path ?? FILE_SEP}${dirName}${FILE_SEP}`
    const div = screen.activeDirectory.element.appendChild(<div>
        <div class="mbs-outfit-path-node" data-path={path} data-active={true}>
            <div class="mbs-outfit-pair">
                <img onClick={directoryClick} src="./Icons/Down.png" />
                <span onClick={factory(directoryClickBob, screen)}>{dirName}</span>
            </div>
        </div> as HTMLDivElement
    </div>) as HTMLDivElement;

    const dirs = Array.from(document.getElementsByClassName("mbs-outfit-pair")) as HTMLDivElement[];
    for (const [i, elem] of dirs.entries()) {
        elem.classList.remove("gray");
        elem.classList.remove("lightgray");
        elem.classList.add(i % 2  ? "gray" : "lightgray");
    }

    screen.activeDirectory = {
        element: div,
        update: new Set(),
        get updateCount() { return this.update.size; },
    };
}

function addFile(this: HTMLInputElement, event: Event, screen: OutfitScreen) {
    if (!screen.activeDirectory) {
        return;
    }

    const fileName = prompt("Enter outfit name")?.trim().replace(FILE_REGEX_INVERT, "");
    if (!fileName) {
        return;
    }

    const outfitCode = prompt("Enter outfit code")?.trim();
    if (!outfitCode) {
        return;
    }

    let items: ItemBundle[];
    let itemList: FWItem[];
    try {
        items = JSON.parse(LZString.decompressFromBase64(outfitCode) as string);
        itemList = fromItemBundles(items);
    } catch (ex) {
        console.error(ex);
        return;
    }

    const dirs = Array.from(document.getElementsByClassName("mbs-outfit-pair")) as HTMLDivElement[];
    for (const [i, elem] of dirs.entries()) {
        elem.classList.remove("gray");
        elem.classList.remove("lightgray");
        elem.classList.add(i % 2  ? "gray" : "lightgray");
    }

    screen.activeDirectory = null;
    screen.activeOutfit = null;
}

async function renameDirectory(this: HTMLInputElement, event: Event, screen: OutfitScreen) {
    if (!screen.activeDirectory || screen.activeDirectory.deleteDirectory) {
        return;
    }

    const path = (screen.activeDirectory.element.dataset.path || "").split(FILE_SEP).filter(Boolean);
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

export function functionCreateTopBar(screen: OutfitScreen) {
    return (
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
        </div>
    ) as HTMLDivElement;
}
