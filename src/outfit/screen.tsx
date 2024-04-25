import { waitFor } from "../common";
import { bcLoaded } from "../common_bc";
import { MBSScreen, ScreenParams } from "../screen_abc";

import { validateColor, updatePreview } from "./common";
import { OutfitCollection, DirectoryCache, OutfitCache, ItemCache } from "./outfit_collection";
import { name, property, color, description, layering, type, difficulty, buttonBar } from "./item";
import * as outfit2 from "./outfit";
import * as directory from "./directory";

import styles from "./screen.scss";

const root = "mbs-outfit";
const ID = Object.freeze({
    root,
    styles: `${root}-style`,

    top: `${root}-top`,
    left: `${root}-left`,
    mid: `${root}-mid`,
    right: `${root}-right`,

    ...directory.ID,
});

waitFor(bcLoaded).then(() => {
    TightenLoosenScreenBlacklist.add(OutfitScreen.screen);

    DialogLeaveFocusItemHandlers.DialogFocusItem[OutfitScreen.screen] = (item) => {
        if (outfitScreen) {
            type.onExit(item, outfitScreen);
            outfitScreen.mode = "base";
        }
    };

    CharacterGetCurrentHandlers[OutfitScreen.screen] = () => outfitScreen?.preview ?? null;

    Layering.RegisterExitCallbacks({
        screen: OutfitScreen.screen,
        callback(C, item) {
            if (outfitScreen) {
                layering.onExit(item, outfitScreen);
                outfitScreen.mode = "base";
            }
        },
    });
});

let outfitScreen: OutfitScreen | null = null;

type OutfitMode = "base" | "extended" | "color" | "layering";

export class OutfitScreen extends MBSScreen {
    static readonly background = "Sheet";
    static readonly screen = `MBS_${OutfitScreen.name}`;
    static readonly ids = ID;
    static readonly screenParamsDefault = {
        [root]: Object.freeze({
            shape: [80, 60, 1840, 880] as RectTuple,
            visibility: "visible",
        }),
    };

    readonly data: OutfitCollection;
    readonly preview: Character;

    activeDirectory: null | DirectoryCache = null;

    #activeOutfit: null | OutfitCache = null;
    get activeOutfit() { return this.#activeOutfit; }
    set activeOutfit(value) {
        if (value === this.#activeOutfit) {
            return;
        }
        this.activeItem = null;

        if (this.#activeOutfit) {
            this.#activeOutfit.element.style.backgroundColor = "";
            if (this.#activeOutfit.updateCount) {
                const color = this.#activeOutfit.deleteOutfit ? "pink" : "lightgreen";
                this.#activeOutfit.element.style.setProperty("--background-overlay", color);
                this.data.cache.set(this.#activeOutfit.outfit.id, this.#activeOutfit);
            } else {
                this.#activeOutfit.element.style.setProperty("--background-overlay", "");
            }
        }

        const rootElem = document.getElementById(ID.midTop) as HTMLDivElement;
        if (value == null) {
            rootElem.style.display = "none";
            updatePreview(this.preview);
        } else {
            value.element.style.backgroundColor = "var(--mbs-hover-color)";
            rootElem.style.display = "";
            updatePreview(this.preview, value.outfit.outfit);
        }
        this.#activeOutfit = value;
    }

    #activeItem: null | ItemCache = null;
    get activeItem() { return this.#activeItem; }
    set activeItem(value) {
        if (value === this.#activeItem) {
            return;
        }
        this.mode = "base";

        // Push active queued item changes to the outfit queue
        if (this.#activeItem) {
            this.#activeItem.element.style.backgroundColor = "";
            if (this.#activeItem.updateCount) {
                const activeOutfit = this.activeOutfit as OutfitCache;
                activeOutfit.newOutfit ??= {};
                activeOutfit.newOutfit[this.#activeItem.item.Asset.Group.Name] = this.#activeItem;
                this.#activeItem.element.style.setProperty("--background-overlay", "lightgreen");
            } else {
                this.#activeItem.element.style.setProperty("--background-overlay", "");
            }
        }

        const rootElem = document.getElementById(ID.midBot) as HTMLDivElement;
        if (value == null) {
            rootElem.style.display = "none";
        } else {
            value.element.style.backgroundColor = "var(--mbs-hover-color)";
            rootElem.style.display = "";
        }
        this.#activeItem = value;
    }

    #mode: OutfitMode = "base";
    get mode() { return this.#mode; }
    set mode(value) {
        if (value === this.#mode) {
            return;
        } else if (value === "base") {
            this.#mode = value;
            this.resize(true);
            return;
        }

        if (!this.activeItem) {
            return;
        }

        this.unload();
        const [x, y, w, h] = this.screenParams[this.ids.root].shape;
        const xGap = 2000 - (x + w);
        switch (value) {
            case "layering": {
                const elem = Layering.Init(this.activeItem.newItem, this.preview, { x: 1000, y, w: 1000 - xGap, h });
                elem.style.backgroundColor = "unset";
                break;
            }
            case "color": {
                ItemColorLoad(this.preview, this.activeItem.newItem, 1050, y, 1000 - 50 - xGap, h, true);
                ItemColorOnExit((character, item, save) => {
                    if (save) {
                        item.Color = validateColor(item.Asset, item.Color);
                        color.onExit(item, this);
                    }
                    this.mode = "base";
                });
                break;
            }
            case "extended":
                DialogExtendItem(this.activeItem.newItem);
                break;
        }
        this.#mode = value;
    }

    constructor(
        parent: null | MBSScreen,
        data: OutfitCollection,
        params: null | ScreenParams.Partial = null,
    ) {
        super(parent, OutfitScreen.screenParamsDefault, params);
        this.data = data;

        this.preview = CharacterLoadSimple((this.constructor as typeof OutfitScreen).screen);
        this.preview.Ownership = {
            MemberNumber: Player.MemberNumber as number,
            Name: Player.Name,
            Start: CommonTime(),
            Stage: 1,
        };
        this.preview.Lovership = [
            { MemberNumber: Player.MemberNumber as number, Name: Player.Name, Start: CommonTime(), Stage: 2 },
        ];
        this.preview.OnlineSharedSettings = { ItemsAffectExpressions: false } as CharacterOnlineSharedSettings;
        this.preview.Appearance = Player.Appearance.filter(i => i.Asset.Group.IsAppearance());
        CharacterRefresh(this.preview, false, false);

        document.body.appendChild(
            <div id={ID.root} class="mbs-screen">
                <style id={ID.styles}>{styles.toString()}</style>

                <div id={ID.top}>
                    {directory.createElementTopBar(this)}
                </div>

                <div id={ID.left}>
                    {directory.createSearchBar(this)}
                    {directory.createElementSideBar(data, this)}
                </div>

                <div id={ID.mid}>
                    <div id={ID.midTop} style={{ display: "none" }}>
                        {outfit2.createElement(this)}
                        <div id={ID.outfitContainer}/>
                    </div>
                    <div id={ID.midBot} style={{ display: "none" }}>
                        {color.createElement(this)}
                        {property.createElement()}
                        {type.createElement(this)}
                        {layering.createElement(this)}
                        {difficulty.createElement(this)}
                        {buttonBar.createElement(this)}
                        {name.createElement(this)}
                        {description.createElement(this)}
                    </div>
                </div>
            </div>,
        );

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        outfitScreen = this;
        // @ts-ignore
        globalThis.MBS_OUTFIT_SCREEN = this;
    }

    click() {
        const asset = this.activeItem?.newItem?.Asset as Asset;
        const [x, y, w, h] = this.screenParams[this.ids.root].shape;
        const xGap = 2000 - (x + w);
        switch (this.mode) {
            case "extended":
                CommonCallFunctionByNameWarn(`Inventory${asset.Group.Name}${asset.Name}Click`);
                return;
            case "color":
                ItemColorClick(this.preview, asset.Group.Name, 1050, y, 1000 - 50 - xGap, h, true);
                return;
        }
    }

    resize(load: boolean) {
        switch (this.mode) {
            case "base":
                super.resize(load);
                return;
            case "layering":
                Layering.Resize(load);
                return;
        }
    }

    draw() {
        if (this.mode === "base") {
            DrawCharacter(this.preview, 1575, 210, 0.75, false);
            return;
        }

        const asset = this.activeItem?.newItem?.Asset as Asset;
        const [x, y, w, h] = this.screenParams[this.ids.root].shape;
        const xGap = 2000 - (x + w);
        DrawRect(1000, 0, 1000, 1000, "rgba(0,0,0,0.55)");
        switch (this.mode) {
            case "extended":
                DrawButton(1885, 25, 90, 90, "", "White", "Icons/Exit.png", TextGet("Exit"));
                CommonCallFunctionByNameWarn(`Inventory${asset.Group.Name}${asset.Name}Draw`);
                break;
            case "color":
                ItemColorDraw(this.preview, asset.Group.Name, 1050, y, 1000 - 50 - xGap, h, true);
                break;
        }
        DrawCharacter(this.preview, 500, 75, 0.9, false);
    }

    exit() {
        switch (this.mode) {
            case "base": {
                if (this.activeItem) {
                    this.activeItem = null;
                } else if (this.activeOutfit) {
                    this.activeOutfit = null;
                } else if (this.activeDirectory) {
                    this.activeDirectory = null;
                } else {
                    super.exit();
                    this.exitScreens(false);
                    CharacterDelete(this.preview);
                    outfitScreen = null;
                    // @ts-ignore
                    delete globalThis.MBS_OUTFIT_SCREEN;
                }
                return;
            }
            case "extended":
                DialogLeaveFocusItem();
                return;
            case "color":
                ItemColorExitClick();
                return;
            case "layering":
                Layering.Exit();
                return;
        }
    }
}
