import { zip } from "lodash-es";

import { factory } from "./common";
import { Outfit, OutfitCollection } from "./outfit_collection";
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
            <input type="text" id={ID.searchInput} placeholder="Search" onInput={searchInput} />
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
