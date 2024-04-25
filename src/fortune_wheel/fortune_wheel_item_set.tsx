/** Configuration screen for custom wheel of fortune options */

import { clamp } from "lodash-es";

import { FWSelectedItemSet, FWItemSet } from "../common_bc";
import { MBSScreen, MBSObjectScreen, ExitAction, ScreenParams } from "../screen_abc";
import { byteToKB } from "../settings";

import { toItemBundles } from "./item_bundle";
import { fortuneWheelEquip, StripLevel, getStripCondition } from "./equipper";
import { createKwargElements, wheelHookRegister, resetKwargElements, updateKwargElements } from "./events";

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
    id: string,
    level: "stripLevel" | "equipLevel";
}>;

function createDropdown(fields: FieldsType, settings: FWSelectedItemSet, disabled: boolean) {
    return <select
        required
        disabled={disabled}
        id={fields.id}
        onChange={function () {
            settings[fields.level] = clamp(
                Number.parseInt(this.value, 10),
                StripLevel.NONE,
                StripLevel.COSPLAY,
            ) as StripLevel;
        }}
        onFocus={function() {
            try {
                this.showPicker?.();
            } catch {
                return;
            }
        }}
    >
        {Object.values(STRIP_MAPPING).slice(0, 4).map((value, i) => <option value={i} default={i === 0}>{value}</option>)}
    </select>;
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
            aria-label="Configure lock time"
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
                    e.stopImmediatePropagation();
                    return;
                }

                e.preventDefault();
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

function createHookMenu(screen: FWItemSetScreen): [HTMLSpanElement, HTMLMenuElement] {
    function changeListener(this: HTMLInputElement, ev: Event) {
        if (!this.validity.valid) {
            this.checked = this.defaultChecked;
            ev.stopImmediatePropagation();
            return;
        }

        const parent = this.closest(".mbs-fwitemset-event");
        const hookName = parent?.getAttribute("data-name");
        const hookType = parent?.getAttribute("data-type") as null | undefined | import("./events/register").ExtendedWheelEvents.Events.Names;
        const modName = parent?.getAttribute("data-mod");
        if (!hookName || !hookType || !modName || !parent) {
            ev.stopImmediatePropagation();
            return;
        }

        const inputs = Array.from(parent.querySelectorAll(".mbs-fwitemset-event-kwarg-config")) as (HTMLInputElement | HTMLSelectElement | HTMLButtonElement)[];
        if (this.checked) {
            screen.settings.activeHooks.set(
                `${modName}-${hookType}-${hookName}`,
                { modName, hookType, hookName, kwargs: new Map },
            );
            inputs.forEach(e => {
                e.toggleAttribute("disabled", false);
                e.dispatchEvent(new CustomEvent("change", { detail: "no-preview-refresh" }));
            });
        } else {
            screen.settings.activeHooks.delete(`${modName}-${hookType}-${hookName}`);
            inputs.forEach(e => e.toggleAttribute("disabled", true));
        }
        screen.reloadPreviewAppearance();

        const collapser = parent.querySelector("button.mbs-fwitemset-event-collapse") as null | HTMLButtonElement;
        if (collapser && collapser.ariaExpanded !== "true") {
            collapser.click();
        }
    }

    return [
        <span id={ID.eventsLabel}>Addon-specific options:</span> as HTMLSpanElement,
        <menu id={ID.events} aria-labelledby="mbs-fwitemset-events-label">
            {wheelHookRegister.values().sort((data1, data2) => {
                return (
                    data1.registrationData.name.localeCompare(data2.registrationData.name)
                    || data1.hookType.localeCompare(data2.hookType)
                    || data1.hookName.localeCompare(data2.hookName)
                );
            }).map((data) => {
                if (!data.showConfig) {
                    return null as never;
                }

                const idSuffix = `${data.registrationData.name}-${data.hookType}-${data.hookName}`;
                const menuItems = createKwargElements(`${ID.events}-${idSuffix}`, data.kwargs, screen.settings);
                menuItems.flatMap(item => {
                    return Array.from(item.querySelectorAll("input, select"));
                }).forEach(e => {
                    e.addEventListener("change", (ev) => {
                        if (ev instanceof CustomEvent && ev.detail === "no-preview-refresh") {
                            return;
                        }
                        screen.reloadPreviewAppearance();
                    });
                });

                if (menuItems.length === 0) {
                    menuItems.push(<li class="mbs-fwitemset-event-menu-placeholder" aria-hidden="true"><b>—</b></li> as HTMLElement);
                } else {
                    menuItems.push(<li class="mbs-fwitemset-event-menu-placeholder" aria-hidden="true">{ElementButton.Create(
                        `${ID.eventsCheckbox}-${idSuffix}-collapse2`,
                        function (ev) {
                            const button = this.closest(".mbs-fwitemset-event")?.querySelector("button.mbs-fwitemset-event-collapse") as null | HTMLButtonElement;
                            if (!button) {
                                ev.stopImmediatePropagation();
                                return;
                            }
                            button.click();
                        },
                        { label: "...", noStyling: true, labelPosition: "center" },
                        {
                            button: { attributes: { "aria-label": "Uncollapse section" } },
                            label: { attributes: { "aria-hidden": "true" } },
                        },
                    )}</li> as HTMLElement);
                }

                const li = (
                    <li data-name={data.hookName} data-mod={data.registrationData.name} data-type={data.hookType} class="mbs-fwitemset-event">
                        {ElementButton.Create(
                            `${ID.eventsCheckbox}-${idSuffix}-collapse`,
                            function (ev) {
                                if (ev.shiftKey) {
                                    const isExpanded = this.ariaExpanded === "true";
                                    const parent = document.getElementById(ID.events);
                                    const children = parent?.querySelectorAll(`button.mbs-fwitemset-event-collapse[aria-expanded="${!isExpanded}"`) ?? [];
                                    children.forEach(e => (e as HTMLButtonElement).click());
                                    if (children.length && !isExpanded) {
                                        this.click();
                                        return;
                                    }
                                }

                                const label = this.querySelector(".button-label");
                                if (!label) {
                                    ev.stopImmediatePropagation();
                                    return;
                                }
                                if (this.ariaExpanded === "true") {
                                    label.textContent = "▼";
                                    this.closest(".mbs-fwitemset-event")?.scrollIntoView({ behavior: "instant" });
                                } else {
                                    label.textContent = "▶";
                                }
                            },
                            { label: "▼", noStyling: true, role: "checkbox", labelPosition: "center" },
                            {
                                button: {
                                    attributes: {
                                        "aria-label": "Collapse section",
                                        "aria-expanded": "true",
                                        "aria-checked": "true",
                                    },
                                    classList: ["mbs-fwitemset-event-collapse"],
                                },
                                label: { attributes: { "aria-hidden": "true" } },
                            },
                        )}
                        <input
                            type="checkbox"
                            class="mbs-fwitemset-event-checkbox"
                            id={`${ID.eventsCheckbox}-${idSuffix}`}
                            onChange={changeListener}
                            aria-describedby={`${ID.eventsCheckbox}-${idSuffix}-description`}
                        />
                        <section>
                            <p><label for={`${ID.eventsCheckbox}-${idSuffix}`}>
                                <span>{`${data.registrationData.name}: `}{data.label as (string | HTMLElement)[]}</span>
                            </label> </p>
                            <p id={`${ID.eventsCheckbox}-${idSuffix}-description`}>
                                {data.description as (string | HTMLElement)[]}
                            </p>
                        </section>
                        <menu class="mbs-fwitemset-event-menu" aria-label="Configuration">{menuItems}</menu>
                    </li>
                );
                return li;
            }).filter(Boolean)}
        </menu> as HTMLMenuElement,
    ];
}

const root = "mbs-fwitemset";
const ID = Object.freeze({
    root: root,
    styles: `${root}-style`,

    delete: `${root}-delete`,
    accept: `${root}-accept`,
    cancel: `${root}-cancel`,
    exit: `${root}-exit`,
    header: `${root}-header`,
    midDiv: `${root}-mid-grid`,
    botDiv: `${root}-bot-grid`,

    outfitName: `${root}-outfit-name`,
    outfitInput: `${root}-outfit-input`,
    outfitButton: `${root}-outfit-button`,

    stripHeader: `${root}-strip-header`,
    stripSelect: `${root}-strip-dropdown`,

    equipHeader: `${root}-equip-header`,
    equipSelect: `${root}-equip-dropdown`,

    weightHeader: `${root}-weight-header`,
    weightInput: `${root}-weight-input`,

    lockHeader: `${root}-lock-header`,
    lockGrid: `${root}-lock-grid`,
    lockContainer: `${root}-lock-container`,
    lockCheckbox: `${root}-lock-checkbox`,
    lockTimer: `${root}-lock-timer`,

    events: `${root}-events`,
    eventsLabel: `${root}-events-label`,
    eventsCheckbox: `${root}-events-checkbox`,
});

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

        const groups = {
            Appearance: { label: "Body and clothes", groups: [] as AssetGroup[] },
            Item: { label: "Items and restraints", groups: [] as AssetGroup[] },
        } satisfies Partial<Record<AssetGroup["Category"], { label: string, groups: AssetGroup[] }>>;

        AssetGroup.filter(g => {
            return g.AllowNone;
        }).sort((g1, g2) => {
            return g1.Category.localeCompare(g2.Category) || g1.Description.localeCompare(g2.Description);
        }).forEach(g => {
            if (g.Category in groups) {
                groups[g.Category as keyof typeof groups].groups.push(g);
            }
        });

        document.body.appendChild(
            <div id={ID.root} class="mbs-screen">
                <style id={ID.styles}>{styles.toString()}</style>

                {
                    ElementMenu.Create(
                        "mbs-fwitemset-menubar",
                        [
                            <h1 id={ID.header}>{`Customize wheel of fortune item set ${this.index}`}</h1>,
                            ElementButton.Create(
                                ID.delete,
                                () => this.exit(false, ExitAction.DELETE),
                                { image: "./Icons/Trash.png", tooltip: "Delete item set", tooltipPosition: "right", disabled },
                                { button: { attributes: { "screen-generated": undefined } } },
                            ),
                            ElementButton.Create(
                                ID.accept,
                                () => this.exit(false, ExitAction.SAVE),
                                { image: "./Icons/Accept.png", tooltip: "Save item set:\nMissing outfit", tooltipPosition: "left", disabled },
                                { button: { attributes: { form: "mbs-fwitemset-form", type: "submit", "screen-generated": undefined } } },
                            ),
                            ElementButton.Create(
                                ID.cancel,
                                () => this.exit(false, ExitAction.NONE),
                                { image: "./Icons/Cancel.png", tooltip: "Cancel", tooltipPosition: "left", disabled },
                                { button: { attributes: { "screen-generated": undefined } } },
                            ),
                            ElementButton.Create(
                                ID.exit,
                                () => this.exit(true, ExitAction.NONE),
                                { image: "./Icons/Exit.png", tooltip: "Exit", tooltipPosition: "left" },
                                { button: { attributes: { "screen-generated": undefined } } },
                            ),
                        ],
                        { direction: "ltr" },
                    )
                }

                <div id="mbs-fwitemset-form" role="form" class="scroll-box" aria-labelledby={ID.header}>
                    <input
                        type="text"
                        id={ID.outfitName}
                        placeholder="Outfit name"
                        aria-label="Outfit name"
                        disabled={disabled}
                        maxLength={70}
                        onInput={(e) => {
                            this.settings.name = (e.target as HTMLInputElement).value;
                            this.#updateButton(ID.accept);
                        }}
                        onFocus={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <input
                        type="text"
                        id={ID.outfitInput}
                        placeholder="Outfit code"
                        aria-label="Outfit code"
                        disabled={disabled}
                        onInput={(e) => {
                            this.settings.outfitCache = (e.target as HTMLInputElement).value;
                            this.#updateButton(ID.outfitButton);
                        }}
                        onFocus={(e) => (e.target as HTMLInputElement).select()}
                    />
                    {ElementButton.Create(
                        ID.outfitButton,
                        () => this.#updateButton(ID.accept, true),
                        {
                            tooltip: "Parse the outfit code",
                            label: "Parse",
                            labelPosition: "center",
                            disabled: true,
                            tooltipPosition: "bottom",
                            tooltipRole: "label",
                        },
                        {
                            label: { attributes: { "aria-hidden": "true" } },
                        },
                    )}

                    <label id={ID.stripHeader} for={ID.stripSelect}>Clothing strip level:</label>
                    <label id={ID.equipHeader} for={ID.equipSelect}>Clothing equip level:</label>
                    <label id={ID.weightHeader} for={ID.weightInput}>Wheel option weight:</label>
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

                            e.preventDefault();
                            if (e.deltaY < 0) {
                                target.stepUp(1);
                            } else if (e.deltaY > 0) {
                                target.stepDown(1);
                            } else {
                                return;
                            }
                            target.dispatchEvent(new InputEvent("input"));
                        }}
                        onFocus={(e) => (e.target as HTMLInputElement).select()}
                    />

                    {createDropdown(
                        { id: ID.stripSelect, level: "stripLevel" },
                        this.settings,
                        disabled,
                    )}
                    {createDropdown(
                        { id: ID.equipSelect, level: "equipLevel" },
                        this.settings,
                        disabled,
                    )}

                    <menu id={ID.lockGrid} aria-labelledby={ID.lockHeader}> {
                        this.settings.flags.map((flag, i) => {
                            let companion: HTMLElement;
                            let label: string | undefined = undefined;
                            switch (flag.type) {
                                case "TimerPasswordPadlock":
                                    companion = createTimerInput(flag, i, disabled);
                                    label = "Timer lock";
                                    break;
                                default:
                                    companion = <label for={ID.lockCheckbox + i.toString()}>{flag.description}</label> as HTMLLabelElement;
                            }
                            return (
                                <li class={ID.lockContainer} id={ID.lockContainer + i.toString()}>
                                    <input
                                        type="checkbox"
                                        class={ID.lockCheckbox}
                                        id={ID.lockCheckbox + i.toString()}
                                        disabled={disabled}
                                        checked={flag.enabled}
                                        onClick={() => {
                                            flag.enabled = !flag.enabled;
                                            this.#updateButton(ID.accept);
                                        }}
                                        aria-label={label}
                                    />
                                    {companion}
                                </li>
                            );
                        })
                    } </menu>

                    {createHookMenu(this)}
                </div>
            </div>,
        );

        // @ts-ignore
        window.bob = this;
    }

    #canSave() {
        return (
            this.settings.isValid(this.index)
            && this.hasStorageSpace()
        );
    }

    #updateButton(type: typeof ID.accept | typeof ID.outfitButton, loadOutfit=false) {
        const button = document.getElementById(type) as HTMLButtonElement;
        const disabled = !this.character.IsPlayer();
        switch (type) {
            case ID.accept: {
                if (loadOutfit) {
                    const validOutfit = this.settings.loadFromBase64();
                    button.disabled = disabled || !(validOutfit && this.#canSave());
                    if (validOutfit) {
                        this.reloadPreviewAppearance();
                    }
                } else {
                    button.disabled = disabled || !(this.settings.itemList !== null && this.#canSave());
                }
                break;
            }
            case ID.outfitButton: {
                button.disabled = disabled || !this.settings.outfitCache;
                break;
            }
            default:
                throw new Error(`Unsupported tooltip type: ${type}`);
        }
        this.#updateTooltip(button);
    }

    #updateTooltip(parentButton: HTMLButtonElement) {
        const tooltip = parentButton.querySelector("[role='tooltip']") as null | HTMLElement;
        if (!tooltip) {
            return;
        }

        switch (parentButton.id) {
            case ID.accept: {
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

            case ID.outfitButton: {
                const prefix = "Parse outfit code";
                if (this.settings.outfitCache) {
                    tooltip.innerText = prefix;
                } else {
                    tooltip.innerText = `${prefix}:\nMissing code`;
                }
                break;
            }

            default:
                throw new Error(`Unsupported tooltip type: ${parentButton.id}`);
        }
    }

    #previewUpdate = false;

    /** Reload the appearance of thepreview character based on the current settings. */
    reloadPreviewAppearance(): void {
        if (this.#previewUpdate) {
            return;
        }

        this.#previewUpdate = true;
        this.preview.Appearance = [...this.character.Appearance];
        this.preview.OnlineSharedSettings = this.character.OnlineSharedSettings;
        if (this.settings.itemList === null) {
            this.#previewUpdate = false;
            return;
        }
        const equiplevel = this.settings.equipLevel;
        this.#reloadPreviewAppearance(this.settings.itemList, equiplevel);
    }

    async #reloadPreviewAppearance(itemList: readonly FWItem[], equiplevel: StripLevel) {
        CharacterReleaseTotal(this.preview);
        const condition = getStripCondition(equiplevel, this.preview);
        const family = this.preview.AssetFamily;
        const items = itemList.filter(({ Name, Group }) => {
            const asset = AssetGet(family, Group, Name);
            if (asset == null) {
                return false;
            } else if (asset.Group.Category !== "Appearance") {
                return true;
            } else {
                return condition(asset);
            }
        });
        fortuneWheelEquip("MBSPreview", items, this.settings.stripLevel, this.preview, this.settings.writeSettings().activeHooks);
        this.#previewUpdate = false;
    }

    /** Loads the club crafting room in slot selection mode, creates a dummy character for previews. */
    load() {
        super.load();

        // Load the settings
        const itemSet = this.mbsObject;
        if (itemSet !== null) {
            this.#loadWithItemSet(itemSet);
        } else {
            this.#loadWithoutItemSet();
        }

        // Load and dress the character character
        this.reloadPreviewAppearance();
    }

    #loadWithItemSet(itemSet: FWItemSet) {
        const isPlayer = this.character.IsPlayer();
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

        const equipElement = document.getElementById(ID.equipSelect) as HTMLSelectElement;
        const stripElement = document.getElementById(ID.stripSelect) as HTMLSelectElement;
        equipElement.value = this.settings.equipLevel.toString();
        stripElement.value = this.settings.stripLevel.toString();
        this.#updateButton(ID.accept);
        this.#updateButton(ID.outfitButton);

        for (const menu of document.querySelectorAll(".mbs-fwitemset-event")) {
            const key = `${menu.getAttribute("data-mod") ?? ""}-${menu.getAttribute("data-type") ?? ""}-${menu.getAttribute("data-name") ?? ""}`;
            const activeHook = this.settings.activeHooks.get(key);
            updateKwargElements(menu, activeHook?.kwargs ?? new Map, !isPlayer || activeHook == null);

            const inp = menu.querySelector("input[type='checkbox'].mbs-fwitemset-event-checkbox") as null | HTMLInputElement;
            if (inp) {
                inp.checked = activeHook != null;
                inp.disabled = !isPlayer;
            }
        }
    }

    #loadWithoutItemSet() {
        const isPlayer = this.character.IsPlayer();
        this.settings.reset();
        this.#updateButton(ID.accept);
        this.#updateButton(ID.outfitButton);

        const equipElement = document.getElementById(ID.equipSelect) as HTMLSelectElement;
        const stripElement = document.getElementById(ID.stripSelect) as HTMLSelectElement;
        equipElement.value = this.settings.equipLevel.toString();
        stripElement.value = this.settings.stripLevel.toString();

        const eventsElement = document.getElementById(ID.events) as HTMLElement;
        eventsElement?.querySelectorAll(".mbs-fwitemset-event-checkbox").forEach(e => (e as HTMLInputElement).checked = false);
        if (eventsElement) {
            resetKwargElements(eventsElement, !isPlayer);
            eventsElement.querySelectorAll("input[type='checkbox'].mbs-fwitemset-event-checkbox").forEach(_e => {
                const e = _e as HTMLInputElement;
                e.checked = false;
                e.disabled = !isPlayer;
            });
        }
    }

    draw() {
        DrawCharacter(this.preview, 200, 175, 0.78, false);
    }

    exit(fullExit?: boolean, action?: ExitAction): void {
        CharacterDelete(this.preview);
        super.exit(fullExit, action);
    }
}
