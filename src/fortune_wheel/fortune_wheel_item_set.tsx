/** Configuration screen for custom wheel of fortune options */

import { clamp } from "lodash-es";

import { FWSelectedItemSet, FWItemSet } from "../common_bc";
import { MBSScreen, MBSObjectScreen, ExitAction, ScreenParams } from "../screen_abc";
import { byteToKB } from "../settings";

import { toItemBundles } from "./item_bundle";
import { fortuneWheelEquip, StripLevel, getStripCondition } from "./equipper";
import styles from "./fortune_wheel_item_set.scss";

/** A mapping that maps {@link StripLevel} values to a description. */
const STRIP_MAPPING = Object.freeze({
    [StripLevel.NONE]: "None",
    [StripLevel.CLOTHES]: "Clothes",
    [StripLevel.UNDERWEAR]: "Clothes and underwear",
    [StripLevel.COSPLAY]: "Clothes, underwear and cosplay items",
    [StripLevel.ALL]: "Clothes, underwear, cosplay items and body",
}) satisfies Record<StripLevel, string>;

/**
 * Convert number-based time into a string compatible with the {@link createTimerElement} input element
 * @param time The time in seconds
 * @returns The stringified time
 */
function toInputTime(time: number): string {
    time = Number.isNaN(time) ? 60 : clamp(time, 60, 60 * 240);
    const unitsTime = { h: 0, m: 0, s: 0 };

    unitsTime.h = Math.floor(time / (60 * 60));
    time -= unitsTime.h * 60**2;

    unitsTime.m = Math.floor(time / 60);
    time -= unitsTime.m * 60;

    unitsTime.s = time;

    return `${unitsTime.h.toString().padStart(2, "0")}:${unitsTime.m.toString().padStart(2, "0")}:${unitsTime.s.toString().padStart(2, "0")}`;
}

type FieldsType = Readonly<{
    inputID: string,
    buttonID: string,
    optionID: string,
    dropdownID: string,
    level: "stripLevel" | "equipLevel";
}>;

function createDropdown(fields: FieldsType, settings: FWSelectedItemSet, disabled: boolean) {
    return (
        <div
            id={fields.inputID}
            class="mbs-dropdown"
            onWheel={(e) => {
                const elem = document.getElementById(fields.buttonID) as HTMLButtonElement;
                if (elem.disabled) {
                    return;
                }

                let level: StripLevel;
                if (e.deltaY < 0) {
                    level = clamp(settings[fields.level] - 1, StripLevel.NONE, StripLevel.COSPLAY) as StripLevel;
                } else if (e.deltaY > 0) {
                    level = clamp(settings[fields.level] + 1, StripLevel.NONE, StripLevel.COSPLAY) as StripLevel;
                } else {
                    return;
                }
                settings[fields.level] = level;
                elem.innerText = STRIP_MAPPING[settings[fields.level]];
            }}
        >
            <button class="mbs-button" disabled={disabled} id={fields.buttonID}>{STRIP_MAPPING[StripLevel.UNDERWEAR]}</button>
            <div class="mbs-dropdown-content" id={fields.dropdownID}> {
                Object.values(STRIP_MAPPING).slice(0, 4).map((value, i) => {
                    return <button
                        class="mbs-button mbs-dropdown-button"
                        disabled={disabled}
                        data-level={i}
                        id={fields.optionID + i.toString()}
                        onClick={(e) => {
                            const target = e.target as HTMLButtonElement;
                            settings[fields.level] = clamp(
                                Number.parseInt(target.dataset.level as string),
                                StripLevel.NONE,
                                StripLevel.COSPLAY,
                            ) as StripLevel;
                            const elem = document.getElementById(fields.buttonID) as HTMLButtonElement;
                            elem.innerText = STRIP_MAPPING[settings[fields.level]];
                        }}
                    >{value}</button>;
                })
            } </div>
        </div>
    );
}

function createTimerInput(flag: FWFlagTimerPasswordPadlock, index: number, disabled: boolean) {
    return (
        <input
            type="text"
            class="mbs-timer"
            id={ID.lockTimer + index.toString()}
            disabled={disabled}
            value={toInputTime(flag.time)}
            pattern={/([0]?[0-4]:)?([0-6]?[0-9]:)?([0-6]?[0-9])?/.source}
            maxLength={8}
            onInput={(e) => {
                const target = e.target as HTMLInputElement;

                const [start, end] = [target.selectionStart, target.selectionEnd];
                const value = target.value;
                target.value = value.replace(/[^0-9:]/g, "");
                if (target.value !== value && (start !== null || end !== null)) {
                    const regex = /[^0-9:]/g;
                    const invalid = Array.from(value).map((i, j) => regex.test(i) ? j : -1).filter(i => i !== -1);
                    if (start !== null) {
                        target.selectionStart = invalid.reduce((sum, i) => sum + (start as number >= i ? -1 : 0), start);
                    }
                    if (end !== null) {
                        target.selectionEnd = invalid.reduce((sum, i) => sum + (end as number >= i ? -1 : 0), end);
                    }
                }

                const [h, m, s] = target.value.split(":").slice(-3).map(i => Number.parseInt(i, 10) || 0);
                const time = h * 60**2 + m * 60 + s;
                flag.time = clamp(time, 60, 4 * 60**2);
            }}
            onBlur={(e) => {
                const target = e.target as HTMLInputElement;
                if (target.disabled) {
                    return;
                }

                const [h, m, s] = target.value.split(":").slice(-3).map(i => Number.parseInt(i, 10) || 0);
                const time = h * 60**2 + m * 60 + s;
                target.value = toInputTime(time);
                flag.time = clamp(time, 60, 4 * 60**2);
            }}
            onFocus={(ev) => {
                const target = ev.target as HTMLInputElement;
                const start = target.selectionStart;
                if (start === null) {
                    return;
                } else if (start <= 2) {
                    target.selectionStart = 0;
                    target.selectionEnd = 2;
                } else if (start <= 5) {
                    target.selectionStart = 3;
                    target.selectionEnd = 5;
                } else if (start <= 8) {
                    target.selectionStart = 6;
                    target.selectionEnd = 8;
                }
            }}
            onWheel={(e) => {
                const target = e.target as HTMLInputElement;
                if (target.disabled) {
                    return;
                }

                const value = target.value.replace(/[^0-9:]/g, "");
                const [h, m, s] = value.split(":").slice(-3).map(i => Number.parseInt(i, 10) || 0);
                let time = h * 60**2 + m * 60 + s;
                if (e.deltaY < 0) {
                    time += 120;
                } else if (e.deltaY > 0) {
                    time -= 120;
                } else {
                    return;
                }
                target.value = toInputTime(time);
                flag.time = clamp(time, 60, 4 * 60**2);
            }}
        /> as HTMLInputElement
    );
}


const root = "mbs-fwitemset";
const ID = Object.freeze({
    root: root,
    canvas: `${root}-canvas`,
    styles: `${root}-style`,

    delete: `${root}-delete`,
    deleteButton: `${root}-delete-button`,
    deleteTooltip: `${root}-delete-tooltip`,
    accept: `${root}-accept`,
    acceptButton: `${root}-accept-button`,
    acceptTooltip: `${root}-accept-tooltip`,
    cancel: `${root}-cancel`,
    cancelButton: `${root}-cancel-button`,
    cancelTooltip: `${root}-cancel-tooltip`,
    exit: `${root}-exit`,
    exitButton: `${root}-exit-button`,
    exitTooltip: `${root}-exit-tooltip`,
    header: `${root}-header`,
    midDiv: `${root}-mid-grid`,
    botDiv: `${root}-bot-grid`,

    outfitName: `${root}-outfit-name`,
    outfitInput: `${root}-outfit-input`,
    outfitDiv: `${root}-outfit-div`,
    outfitButton: `${root}-outfit-button`,
    outfitTooltip: `${root}-outfit-tooltip`,

    stripHeader: `${root}-strip-header`,
    stripInput: `${root}-strip-dropdown`,
    stripButton: `${root}-strip-dropdown-button`,
    stripDropdown: `${root}-strip-dropdown-content`,
    stripOption: `${root}-strip-dropdown-option`,

    equipHeader: `${root}-equip-header`,
    equipInput: `${root}-equip-dropdown`,
    equipButton: `${root}-equip-dropdown-button`,
    equipDropdown: `${root}-equip-dropdown-content`,
    equipOption: `${root}-equip-dropdown-option`,

    weightHeader: `${root}-weight-header`,
    weightInput: `${root}-weight-input`,

    lockHeader: `${root}-lock-header`,
    lockGrid: `${root}-lock-grid`,
    lockContainer: `${root}-lock-container`,
    lockCheckbox: `${root}-lock-checkbox`,
    lockTimer: `${root}-lock-timer`,
});

function getColorSegment(layer: AssetLayer, layerColor: string): [layerColor: string, colorSegment: string | undefined] {
    let colorSuffix: string | undefined = undefined;
    if (layer.ColorSuffix && layerColor) {
        colorSuffix = (layerColor[0] === "#") ? layer.ColorSuffix.HEX_COLOR : layer.ColorSuffix[layerColor];
        if (colorSuffix && colorSuffix[0] === "#") {
            layerColor = colorSuffix;
            colorSuffix = undefined;
        }
    }

    const shouldColorize = layer.AllowColorize && layerColor && layerColor[0] === "#";
    let colorSegment = "";

    if (shouldColorize) {
        // The layer is colorizable and has an explicit hexcode, it needs to be drawn colorized
        return [layerColor, colorSuffix];
    } else {
        // The layer isn't colorizable, so validate that the layer color is a named color
        // If a color suffix is specified and isn't Default, it'll completely override the final color
        if (layerColor != null && layerColor !== "Default" && layerColor[0] !== "#") {
            colorSegment = layerColor;
        }
        if (colorSuffix) {
            colorSegment = colorSuffix !== "Default" ? colorSuffix : "";
        }
        return [layerColor, colorSegment];
    }
}

function fetchURLs(character: Character) {
    return character.Appearance.flatMap(item => {
        const asset = item.Asset;
        if (!asset.Visible) {
            return [];
        }

        return item.Asset.Layer.map(layer => {
            if (!layer.HasImage) {
                return "";
            }

            const pose = CommonDrawResolveAssetPose(character, layer);
            let poseSegment = layer.PoseMapping[pose as AssetPoseName];
            switch (poseSegment) {
                case PoseType.HIDE:
                case PoseType.DEFAULT:
                case undefined:
                    poseSegment = "";
                    break;
            }

            let layerType = "";
            const typeRecord = item.Property?.TypeRecord ?? {};
            if (layer.CreateLayerTypes.length > 0) {
                layerType = layer.CreateLayerTypes.map(k => `${k}${typeRecord[k] ?? 0}`).join("");
            }

			let layerColor = CommonDrawResolveLayerColor(character, item, layer, asset.DynamicGroupName);
            let colorSegment: string | undefined;
            [layerColor, colorSegment] = getColorSegment(layer, layerColor);

            const layerSegments = [
                asset.Name,
                character.Appearance.find(i => i.Asset.Group.Name === layer.ParentGroupName)?.Asset?.Name,
                layerType,
                colorSegment,
                layer.Name,
            ]
            const segments = [
                "Assets",
                asset.Group.Family,
                asset.DynamicGroupName,
                poseSegment,
                CommonDrawResolveLayerExpression(character, item, layer),
                layerSegments.filter(Boolean).join("_"),
            ];
            return segments.filter(Boolean).join("/") + ".png";
        }).filter(Boolean);
    });
}

export class FWItemSetScreen extends MBSObjectScreen<FWItemSet> {
    static readonly ids = ID;
    static readonly screen = "MBS_FWItemSetScreen";
    static readonly background = "Sheet";
    readonly settings: FWSelectedItemSet;
    readonly preview: Character;
    static readonly screenParamsDefault = {
        [root]: Object.freeze({
            shape: [80, 60, 1840, 880] as RectTuple,
            visibility: "visible",
        }),
        [ID.canvas]: Object.freeze({
            shape: [0, 0, 2000, 1000] as RectTuple,
            visibility: "visible",
        }),
    };

    constructor(
        parent: null | MBSScreen,
        wheelList: (null | FWItemSet)[],
        index: number,
        character: Character,
        screenParams: null | ScreenParams.Partial = null,
    ) {
        const disabled = !character.IsPlayer();
        super(parent, wheelList, index, character, FWItemSetScreen.screenParamsDefault, screenParams);
        this.settings = new FWSelectedItemSet(wheelList);
        this.preview = CharacterLoadSimple("MBSFortuneWheelPreview");
        this.preview.ArousalSettings = { AffectExpression: false } as ArousalSettingsType;

        document.body.appendChild(<canvas id={ID.canvas} width={2000} height={1000} />);

        document.body.appendChild(
            <div id={ID.root} class="mbs-screen">
                <style id={ID.styles}>{styles.toString()}</style>

                <h1 id={ID.header}>{`Customize wheel of fortune item set ${this.index}`}</h1>
                <div id={ID.delete} class="mbs-button-div">
                    <button
                        class="mbs-button"
                        id={ID.deleteButton}
                        style={{ backgroundImage: "url('./Icons/Trash.png')" }}
                        onClick={() => this.exit(false, ExitAction.DELETE)}
                        disabled={disabled}
                    />
                    <div class="mbs-button-tooltip" id={ID.deleteTooltip} style={{ justifySelf: "left" }}>
                        Delete item set
                    </div>
                </div>
                <div id={ID.accept} class="mbs-button-div">
                    <button
                        class="mbs-button"
                        id={ID.acceptButton}
                        style={{ backgroundImage: "url('./Icons/Accept.png')" }}
                        onClick={() => this.exit(false, ExitAction.SAVE)}
                        disabled={true}
                    />
                    <div class="mbs-button-tooltip" id={ID.acceptTooltip} style={{ justifySelf: "right" }}>
                        Save item set:\nMissing outfit
                    </div>
                </div>
                <div id={ID.cancel} class="mbs-button-div">
                    <button
                        class="mbs-button"
                        id={ID.cancelButton}
                        style={{ backgroundImage: "url('./Icons/Cancel.png')" }}
                        onClick={() => this.exit(false, ExitAction.NONE)}
                    />
                    <div class="mbs-button-tooltip" id={ID.cancelTooltip} style={{ justifySelf: "right" }}>
                        Cancel
                    </div>
                </div>
                <div id={ID.exit} class="mbs-button-div">
                    <button
                        class="mbs-button"
                        id={ID.exitButton}
                        style={{ backgroundImage: "url('./Icons/Exit.png')" }}
                        onClick={() => this.exit(true, ExitAction.NONE)}
                    />
                    <div class="mbs-button-tooltip" id={ID.exitTooltip} style={{ justifySelf: "right" }}>
                        Exit
                    </div>
                </div>

                <input
                    type="text"
                    id={ID.outfitName}
                    placeholder="Name"
                    disabled={disabled}
                    maxLength={70}
                    onInput={(e) => {
                        this.settings.name = (e.target as HTMLInputElement).value;
                        this.#updateButton(ID.acceptButton);
                    }}
                    onFocus={(e) => (e.target as HTMLInputElement).select()}
                />
                <input
                    type="text"
                    id={ID.outfitInput}
                    placeholder="Outfit code"
                    disabled={disabled}
                    onInput={(e) => {
                        this.settings.outfitCache = (e.target as HTMLInputElement).value;
                        this.#updateButton(ID.outfitButton);
                    }}
                    onFocus={(e) => (e.target as HTMLInputElement).select()}
                />
                <div id={ID.outfitDiv} class="mbs-button-div">
                    <button
                        class="mbs-button"
                        disabled={true}
                        id={ID.outfitButton}
                        onClick={() => this.#updateButton(ID.acceptButton, true)}
                    >Parse</button>
                    <div class="mbs-button-tooltip" id={ID.outfitTooltip}>Parse the outfit code</div>
                </div>

                <span id={ID.stripHeader}>Clothing strip level:</span>
                <span id={ID.equipHeader}>Clothing equip level:</span>
                <span id={ID.weightHeader}>Wheel option weight:</span>
                <span id={ID.lockHeader}>Enabled lock types:</span>
                <input
                    type="number"
                    id={ID.weightInput}
                    min={1}
                    max={9}
                    value={1}
                    disabled={disabled}
                    onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        this.settings.weight = clamp(Number.parseInt(target.value, 10), 1, 9);
                    }}
                    onWheel={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.disabled) {
                            return;
                        }

                        if (e.deltaY < 0) {
                            target.stepUp(1);
                        } else if (e.deltaY > 0) {
                            target.stepDown(1);
                        } else {
                            return;
                        }
                        this.settings.weight = clamp(Number.parseInt(target.value, 10), 1, 9);
                    }}
                    onFocus={(e) => (e.target as HTMLInputElement).select()}
                />

                {createDropdown(
                    { inputID: ID.stripInput, buttonID: ID.stripButton, optionID: ID.stripOption, dropdownID: ID.stripDropdown, level: "stripLevel" },
                    this.settings,
                    disabled,
                )}
                {createDropdown(
                    { inputID: ID.equipInput, buttonID: ID.equipButton, optionID: ID.equipOption, dropdownID: ID.equipDropdown, level: "equipLevel" },
                    this.settings,
                    disabled,
                )}

                <div id={ID.lockGrid}> {
                    this.settings.flags.map((flag, i) => {
                        let companion: string | HTMLInputElement;
                        switch (flag.type) {
                            case "TimerPasswordPadlock":
                                companion = createTimerInput(flag, i, disabled);
                                break;
                            default:
                                companion = flag.description;
                        }
                        return (
                            <div class={ID.lockContainer} id={ID.lockContainer + i.toString()}>
                                <input
                                    type="checkbox"
                                    class={ID.lockCheckbox}
                                    id={ID.lockCheckbox + i.toString()}
                                    disabled={disabled}
                                    checked={flag.enabled}
                                    onClick={() => {
                                        flag.enabled = !flag.enabled;
                                        this.#updateButton(ID.acceptButton);
                                    }}
                                />
                                {companion}
                            </div>
                        );
                    })
                } </div>
            </div>,
        );
    }

    #canSave() {
        return (
            this.settings.isValid(this.index)
            && this.hasStorageSpace()
        );
    }

    #updateButton(type: typeof ID.acceptButton | typeof ID.outfitButton, loadOutfit=false) {
        const button = document.getElementById(type) as HTMLButtonElement;
        const disabled = !this.character.IsPlayer();
        switch (type) {
            case ID.acceptButton: {
                if (loadOutfit) {
                    const validOutfit = this.settings.loadFromBase64();
                    button.disabled = disabled || !(validOutfit && this.#canSave());
                    if (!disabled && validOutfit) {
                        this.#reloadPreviewAppearance();
                    }
                } else {
                    button.disabled = disabled || !(this.settings.itemList !== null && this.#canSave());
                }

                this.#updateTooltip(ID.acceptTooltip);
                break;
            }

            case ID.outfitButton: {
                button.disabled = disabled || !this.settings.outfitCache;
                this.#updateTooltip(ID.outfitTooltip);
                break;
            }

            default:
                throw new Error(`Unsupported tooltip type: ${type}`);
        }
    }

    #updateTooltip(type: typeof ID.acceptTooltip | typeof ID.outfitTooltip) {
        const tooltip = document.getElementById(type) as HTMLDivElement;
        switch (type) {
            case ID.acceptTooltip: {
                const prefix = "Save item set";
                if (!this.settings.loadFromBase64()) {
                    tooltip.innerText = `${prefix}:\nMissing outfit`;
                } else if (!this.#canSave()) {
                    if (!this.settings.name) {
                        tooltip.innerText = `${prefix}:\nMissing name`;
                    } else if (this.settings.flags.every(i => !i.enabled)) {
                        tooltip.innerText = `${prefix}:\nMust enable at least one lock type`;
                    } else if (!this.hasStorageSpace()) {
                        tooltip.innerText = `${prefix}:\nDuplicate name`;
                    } else {
                        tooltip.innerText = `${prefix}:\nMax allowed OnlineSharedSettings storage size exceeded (${byteToKB(this.dataSize.value)} / ${byteToKB(this.dataSize.max)}`;
                    }
                } else {
                    tooltip.innerText = prefix;
                }
                break;
            }

            case ID.outfitTooltip: {
                const prefix = "Parse outfit code";
                if (this.settings.outfitCache) {
                    tooltip.innerText = prefix;
                } else {
                    tooltip.innerText = `${prefix}:\nMissing code`;
                }
                break;
            }

            default:
                throw new Error(`Unsupported tooltip type: ${type}`);
        }
    }

    /** Reload the appearance of thepreview character based on the current settings. */
    async #reloadPreviewAppearance() {
        this.preview.Appearance = [...this.character.Appearance];
        this.preview.OnlineSharedSettings = this.character.OnlineSharedSettings;
        CharacterReleaseTotal(this.preview);
        if (this.settings.itemList === null) {
            return;
        }

        const condition = getStripCondition(this.settings.equipLevel, this.preview);
        const family = this.preview.AssetFamily;
        const items = this.settings.itemList.filter(({ Name, Group }) => {
            const asset = AssetGet(family, Group, Name);
            if (asset == null) {
                return false;
            } else if (asset.Group.Category !== "Appearance") {
                return true;
            } else {
                return condition(asset);
            }
        });
        fortuneWheelEquip(
            "MBSPreview", items,
            this.settings.stripLevel, null, null, this.preview,
        );
        this.#reloadCanvas(true);
    }

    /** Loads the club crafting room in slot selection mode, creates a dummy character for previews. */
    load() {
        super.load();

        // Load the settings
        const itemSet = this.mbsObject;
        if (itemSet !== null) {
            this.settings.readSettings(itemSet);
            this.settings.outfitCache = LZString.compressToBase64(
                JSON.stringify(toItemBundles(itemSet.itemList, this.preview)),
            );

            ElementValue(ID.outfitName, itemSet.name);
            ElementValue(ID.weightInput, itemSet.weight.toString());
            ElementValue(ID.outfitInput, this.settings.outfitCache);

            for (const [i, flag] of this.settings.flags.entries()) {
                const checkboxElem = document.getElementById(`${ID.lockCheckbox}${i}`) as HTMLInputElement;
                checkboxElem.checked = flag.enabled;
                switch (flag.type) {
                    case "TimerPasswordPadlock":
                        ElementValue(`${ID.lockTimer}${i}`, toInputTime(flag.time));
                        break;
                }
            }

            const equipElement = document.getElementById(ID.equipButton) as HTMLButtonElement;
            const stripElement = document.getElementById(ID.stripButton) as HTMLButtonElement;
            equipElement.innerText = STRIP_MAPPING[this.settings.equipLevel];
            stripElement.innerText = STRIP_MAPPING[this.settings.stripLevel];
            this.#updateButton(ID.acceptButton, true);
            this.#updateButton(ID.outfitButton);
        } else {
            this.settings.reset();
            this.#updateButton(ID.acceptButton);
            this.#updateButton(ID.outfitButton);
        }

        // Load and dress the character character
        this.#reloadPreviewAppearance();
    }

    async #reloadCanvas(clear: boolean) {
        const canvas = document.getElementById(ID.canvas) as HTMLCanvasElement;
        if (clear) {
            const context = canvas.getContext("2d") as CanvasRenderingContext2D;
            context.clearRect(0, 0, canvas.width, canvas.height);
            const urls = fetchURLs(this.preview);
            await Promise.all(urls.map(i => fetch(i, { cache: "force-cache" })));
        } else {
            Object.assign(canvas.style, { left: "",  top: "", with: "", height: "" });
        }
        DrawCharacter(this.preview, 200, 175, 0.78, undefined, canvas.getContext("2d") as CanvasRenderingContext2D);
    }

    resize(load: boolean): void {
        super.resize(load);
        this.#reloadCanvas(false);
    }

    exit(fullExit?: boolean, action?: ExitAction): void {
        CharacterDelete(this.preview);
        super.exit(fullExit, action);
    }
}
