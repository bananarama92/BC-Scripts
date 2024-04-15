import { MBS_MOD_API, waitFor, logger } from "../common";
import { bcLoaded } from "../common_bc";
import { MBSScreen, ScreenProxy, ScreenParams } from "../screen_abc";
import { FWSelectScreen, loadFortuneWheelObjects } from "../fortune_wheel";

import {
    pushMBSSettings,
    SettingsType,
    getChangeLogURL,
    importSettings,
    exportSettings,
    logSettingsSize,
    SettingsStatus,
    clearMBSSettings,
} from "./settings";
import { garblingJSON } from "../garbling";

import styles from "./settings_screen.scss";

function preferenceLoadHook() {
    if (TextScreenCache != null) {
        TextScreenCache.cache[`Homepage${MBSPreferenceScreen.screen}`] = "MBS Settings";
    }

    const img = new Image();
    img.addEventListener("error", () => DrawGetImageOnError(img, false));
    img.src = "Icons/Maid.png";
    DrawCacheImage.set(`Icons/${MBSPreferenceScreen.screen}.png`, img);
}

export class PreferenceScreenProxy extends ScreenProxy {
    static readonly screen = "Preference";

    constructor() {
        super(
            null,
            "Character",
            "Preference",
            {
                Run: PreferenceRun,
                Click: PreferenceClick,
                Exit: PreferenceExit,
                Load: () => CommonSetScreen("Character", "Preference"),
            },
        );
    }
}

type BoolSettings = keyof { [k in keyof MBSSettings as MBSSettings[k] extends boolean ? k : never]: MBSSettings[k] };

const root = "mbs-preference";
const ID = Object.freeze({
    root,
    canvas: `${root}-canvas`,
    styles: `${root}-style`,

    header: `${root}-header`,
    exit: `${root}-exit`,
    exitButton: `${root}-exit-button`,
    exitTooltip: `${root}-exit-tooltip`,

    settingsGrid: `${root}-settings`,
    settingsPair: `${root}-settings-pair`,
    itemsButton: `${root}-items-button`,
    itemsHeader: `${root}-items-header`,
    wheelButton: `${root}-wheel-button`,
    wheelHeader: `${root}-wheel-header`,

    rollCheckbox: `${root}-roll-checkbox`,
    rollHeader: `${root}-roll-header`,
    lockCheckbox: `${root}-lock-checkbox`,
    lockHeader: `${root}-lock-header`,
    gagCheckbox: `${root}-gag-checkbox`,
    gagHeader: `${root}-gag-header`,

    miscGrid: `${root}-misc`,
    reset: `${root}-reset`,
    resetButton: `${root}-reset-button`,
    resetTooltip: `${root}-reset-tooltip`,
    resetScreen: `${root}-reset-screen`,
    resetBackground: `${root}-reset-background`,
    resetGrid: `${root}-reset-grid`,
    resetAccept: `${root}-reset-accept`,
    resetCancel: `${root}-reset-cancel`,

    import: `${root}-import`,
    importButton: `${root}-import-button`,
    importTooltip: `${root}-import-tooltip`,
    export: `${root}-export`,
    exportButton: `${root}-export-button`,
    exportTooltip: `${root}-export-tooltip`,
    changelog: `${root}-changelog`,
    changelogButton: `${root}-changelog-button`,
    changelogTooltip: `${root}-changelog-tooltip`,
});

export class MBSPreferenceScreen extends MBSScreen {
    static readonly screen = "MBS_PreferenceScreen";
    static readonly ids = ID;
    static readonly screenParamsDefault = {
        [root]: Object.freeze({
            shape: [525, 75, 1380, 850] as RectTuple,
            visibility: "visible",
        }),
        [ID.resetScreen]: Object.freeze({
            shape: [0, 0, 2000, 1000] as RectTuple,
            visibility: "hidden",
        }),
        [ID.canvas]: Object.freeze({
            shape: [0, 0, 2000, 1000] as RectTuple,
            visibility: "visible",
        }),
    };

    constructor(parent: null | MBSScreen, params: null | ScreenParams.Partial = null) {
        super(parent, MBSPreferenceScreen.screenParamsDefault, params);

        document.body.appendChild(<canvas id={ID.canvas} width={2000} height={1000} />);

        document.body.appendChild(
            <div id={ID.root} class="mbs-screen">
                <style id={ID.styles}>{styles.toString()}</style>

                <h1 id={ID.header}>{`Maid's Bondage Scripts ${MBS_VERSION}`}</h1>

                <div id={ID.exit} class="mbs-button-div">
                    <button
                        class="mbs-button"
                        id={ID.exitButton}
                        onClick={this.exit.bind(this)}
                        style={{ backgroundImage: "url('./Icons/Exit.png')" }}
                    />
                    <span class="mbs-button-tooltip" style={{ justifySelf: "right" }}>Exit</span>
                </div>

                <div id={ID.settingsGrid}>
                    <h2>Wheel of fortune settings</h2>
                    <div class="mbs-preference-settings-pair">
                        <button
                            class="mbs-button"
                            style={{ backgroundImage: "url('./Icons/Crafting.png')" }}
                            onClick={this.#loadWheel.bind(this)}
                        />
                        Configure the wheel of fortune
                    </div>
                    <div class="mbs-preference-settings-pair">
                        <input type="checkbox" data-field="RollWhenRestrained" onClick={this.#boolSwitch.bind(this)}/>
                        Allow wheel rolling while restrained
                    </div>
                    <div class="mbs-preference-settings-pair">
                        <input type="checkbox" data-field="LockedWhenRestrained" onClick={this.#boolSwitch.bind(this)}/>
                        Lock MBS settings while restrained
                    </div>

                    <h2>Garbling settings</h2>
                    <div class="mbs-preference-settings-pair">
                        <input type="checkbox" data-field="AlternativeGarbling" onClick={this.#boolSwitch.bind(this)}/>
                        <span>
                            <p>
                                <strong>Experimental</strong>: whether gags will use an alternative form of, more phonetically acurate, speech garbling
                                based on <a href="https://github.com/CordeliaMist/Dalamud-GagSpeak" target="_blank">Dalamud-GagSpeak</a>
                            </p>
                            <p>
                                Incompatible-ish with <a href="https://sidiousious.gitlab.io/bce/" target="_blank">FBC</a>'s
                                garbling anti-cheat as of the moment
                            </p>
                        </span>
                    </div>
                    <div class="mbs-preference-settings-pair">
                        <input type="checkbox" data-field="DropTrailing" onClick={this.#boolSwitch.bind(this)}/>
                        Whether to heaviest gags will drop up to half of all trailing characters
                        when alternate garbling is enabled
                    </div>
                    <div class="mbs-preference-settings-pair">
                        <input type="checkbox" data-field="GarblePerSyllable" onClick={this.#boolSwitch.bind(this)}/>
                        Interpolate between the three alternative garbling levels, allowing for a more gradual increase
                        in garbling strength (on a syllable by syllable basis) as the gag level increases
                    </div>
                </div>

                <div id={ID.miscGrid}>
                    <div id={ID.reset} class="mbs-button-div">
                        <button
                            class="mbs-button"
                            id={ID.resetButton}
                            style={{ backgroundImage: "url('./Icons/ServiceBell.png')" }}
                            onClick={this.#settingsReset.bind(this)}
                        >Reset MBS</button>
                        <span class="mbs-button-tooltip">Clear all MBS data</span>
                    </div>

                    <div id={ID.import} class="mbs-button-div">
                        <button
                            class="mbs-button"
                            id={ID.importButton}
                            onClick={this.#settingsImport.bind(this)}
                        >Import</button>
                        <span class="mbs-button-tooltip">Import MBS settings</span>
                    </div>

                    <div id={ID.export} class="mbs-button-div">
                        <button
                            class="mbs-button"
                            id={ID.exportButton}
                            onClick={this.#settingsExport.bind(this)}
                        >Export</button>
                        <span class="mbs-button-tooltip"> Export MBS settings</span>
                    </div>

                    <div id={ID.changelog} class="mbs-button-div">
                        <button
                            class="mbs-button"
                            id={ID.changelogButton}
                            style={{ backgroundImage: "url('./Icons/Changelog.png')" }}
                            onClick={() => open(getChangeLogURL(), "_blank")}
                        >Latest Changes</button>
                        <span class="mbs-button-tooltip">Open the MBS changelog</span>
                    </div>
                </div>
            </div>,
        );

        document.body.appendChild(
            <div id={ID.resetScreen} class="mbs-screen" screen-generated={MBSPreferenceScreen.screen}>
                <div id={ID.resetBackground}>
                    <h1>MBS data reset</h1>
                    <p><strong>- Warning -</strong></p>
                    <p>If you confirm, <i>all</i> MBS data (including settings, overrides, and current states) will be permanently reset!</p>
                    <p>You will be able to continue using MBS, but all of your configuration will be reset to default!</p>
                    <p><strong>This action cannot be undone!</strong></p>
                    <div id={ID.resetGrid}>
                        <button
                            class="mbs-button"
                            onClick={this.#resetConfirm.bind(this)}
                            disabled={true}
                            id={ID.resetAccept}
                        >Confirm (10)</button>
                        <button
                            class="mbs-button"
                            onClick={this.exit.bind(this)}
                            id={ID.resetCancel}
                        >Cancel</button>
                    </div>
                </div>
            </div>,
        );
    }

    #boolSwitch(event: MouseEvent) {
        const field = (event.target as HTMLInputElement).dataset.field as BoolSettings;
        if (field in Player.MBSSettings) {
            Player.MBSSettings[field] = !Player.MBSSettings[field];
            pushMBSSettings([SettingsType.SETTINGS]);
            switch (field) {
                case "AlternativeGarbling":
                    if (Player.MBSSettings[field]) garblingJSON.init();
                    break;
                case "LockedWhenRestrained":
                    this.#lockInputs();
                    break;
            }
        }
    }

    #settingsImport() {
        const settingsString = prompt(
            "Please paste MBS settings.\nImporting settings will overwrite existing settings. Are you sure?",
        );
        if (!settingsString) {
            return;
        }

        const status = importSettings(settingsString);
        switch (status.status) {
            case SettingsStatus.OK:
                logger.log("Settings successfully updated");
                return alert("Settings successfully updated!");
            case SettingsStatus.ERROR:
                return alert("ERROR: Detected corrupted MBS settings.\nNo changes were made.");
            case SettingsStatus.EMPTY_SETTINGS:
                return alert("ERROR: Detected empty or corrupted MBS settings.\nNo changes were made.");
            case SettingsStatus.WARN: {
                const isConfirm = confirm(
                    "WARNING: MBS successfully parsed the settings but found one or more invalid fields; "
                    + "please check the browser console for more details."
                    + "\nAre you sure you want to continue?",
                );
                if (isConfirm) {
                    Player.MBSSettings = status.settings;
                    pushMBSSettings([SettingsType.SETTINGS, SettingsType.SHARED], true);
                    logSettingsSize();
                    logger.log("Settings successfully updated");
                    alert("Settings successfully updated!");
                }
                return;
            }
            default:
                throw new Error(`Unknown status type: ${(status as any).status}`);
        }
    }

    #settingsExport() {
        const compressed = exportSettings();
        navigator.clipboard.writeText(compressed);
        alert("MBS settings copied to clipboard.");
    }

    #settingsReset() {
        const screen = document.getElementById(ID.resetScreen) as HTMLDivElement;
        const button = document.getElementById(ID.resetAccept) as HTMLButtonElement;
        screen.style.visibility = "visible";
        button.disabled = true;
        this.#startTimer(button);
    }

    async #startTimer(button: HTMLButtonElement) {
        let i = 9;
        while (i >= 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            button.innerText = `Confirm (${i})`;
            i--;
        }
        button.innerText = "Confirm";
        button.disabled = false;
    }

    #resetConfirm() {
        clearMBSSettings();
        this.exit();
    }

    #loadWheel() {
        const wheelStruct = {
            FortuneWheelItemSets: loadFortuneWheelObjects(Player, "FortuneWheelItemSets", "item sets"),
            FortuneWheelCommands: loadFortuneWheelObjects(Player, "FortuneWheelCommands", "commands"),
        };

        const [x, y, w, h] = this.screenParams[this.ids.root].shape;
        const params = { [FWSelectScreen.ids.root]: { shape: [95, y, w + (x - 95), h] as RectTuple } };
        this.loadChild(FWSelectScreen, wheelStruct, Player, params);
    }

    #lockInputs() {
        const disabled = Player.IsRestrained() && Player.MBSSettings.LockedWhenRestrained;
        const root = document.getElementById(ID.settingsGrid) as HTMLDivElement;
        for (const elemOuter of root.children) {
            for (const elemInner of elemOuter.children as Iterable<HTMLInputElement>) {
                const field = elemInner.dataset?.field;
                if (field && field in Player.MBSSettings) {
                    elemInner.checked = Player.MBSSettings[field as BoolSettings];
                    elemInner.disabled = disabled;
                }
            }
        }
    }

    load() {
        this.#lockInputs();
        super.load();
    }

    resize(load: boolean) {
        super.resize(load);
        const canvas = document.getElementById(ID.canvas) as HTMLCanvasElement;
        Object.assign(canvas.style, { left: "",  top: "", with: "", height: "" });
        DrawCharacter(Player, 50, 50, 0.9, undefined, canvas.getContext("2d") as CanvasRenderingContext2D);
    }

    exit() {
        const resetScreen = document.getElementById(ID.resetScreen) as HTMLDivElement;
        if (resetScreen.style.visibility === "visible") {
            resetScreen.style.visibility = "hidden";
        } else {
            super.exit();
            this.exitScreens(false);
        }
    }
}

let preferenceState: PreferenceScreenProxy;

waitFor(bcLoaded).then(() => {
    MBS_MOD_API.hookFunction("PreferenceLoad", 0, (args, next) => {
        next(args);
        preferenceLoadHook();
    });

    ServerPlayerChatRoom.register({
        screen: MBSPreferenceScreen.screen,
        callback: () => InformationSheetPreviousScreen === "ChatRoom",
    });

    MBS_MOD_API.hookFunction("PreferenceClick", 0, (args, next) => {
        const previousScreen = PreferenceSubscreen;
        next(args);
        if (!previousScreen && PreferenceSubscreen as string === MBSPreferenceScreen.screen) {
            PreferenceExit();
            preferenceState.loadChild(MBSPreferenceScreen);
        }
    });

    (PreferenceSubscreenList as string[]).push(MBSPreferenceScreen.screen);
    preferenceState = new PreferenceScreenProxy();

    switch (CurrentScreen) {
        case "Preference":
            return preferenceLoadHook();
    }
});
