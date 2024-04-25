import { sumBy, merge, cloneDeep } from "lodash-es";

import { validateInt, keys, entries } from "./common";
import { MAX_DATA, measureDataSize } from "./settings";

export namespace ScreenParams {
    interface Params {
        /** The dimensions of the screen */
        readonly shape: RectTuple,
        /** The default visibility upon loading */
        readonly visibility: "visible" | "hidden",
    }

    export type Full = Readonly<Record<string, Params>>;
    export type Partial = Readonly<Record<string, globalThis.Partial<Params>>>;
}

export abstract class MBSScreen {
    /** The name of the screen's background. */
    static readonly background: string = "Sheet";
    /** The name of the screen. */
    static readonly screen: string = "";
    /** The name of the screen. */
    get screen() {
        return (this.constructor as typeof MBSScreen).screen;
    }

    /** The parent screen if any. Only relevant when multiple screens are opened in succession. */
    readonly parent: null | MBSScreen;
    /** The child screen if any. Only relevant when multiple screens are opened in succession. */
    child: null | MBSScreen;

    static readonly ids: Readonly<Record<"root", string>>;
    get ids() {
        return (this.constructor as typeof MBSScreen).ids;
    }
    readonly screenParams: ScreenParams.Full;
    static readonly screenParamsDefault: ScreenParams.Full = {};

    get rootParams() {
        return this.screenParams[(this.constructor as typeof MBSScreen).ids.root];
    }

    constructor(
        parent: null | MBSScreen,
        screenParamsDefault: ScreenParams.Full,
        screenParams: null | ScreenParams.Partial,
    ) {
        this.parent = parent;
        this.screenParams = merge(cloneDeep(screenParamsDefault), screenParams ?? {});
        this.child = null;
    }

    /**
     * Called when screen size or position changes or after screen load
     * @param load - If the reason for call was load (`true`) or window resize (`false`)
     */
    resize(load: boolean) {
        // Different positions based on the width/height ratio
        const heightRatio = MainCanvas.canvas.clientHeight / 1000;
        const widthRatio = MainCanvas.canvas.clientWidth / 2000;
        for (const [id, { shape, visibility }] of entries(this.screenParams)) {
            const left = MainCanvas.canvas.offsetLeft + shape[0] * widthRatio;
            const top = MainCanvas.canvas.offsetTop + shape[1] * heightRatio;
            const width = shape[2] * widthRatio;
            const height = shape[3] * heightRatio;

            const style: Partial<CSSStyleDeclaration> = {
                left: `${left}px`,
                top: `${top}px`,
                width: `${width}px`,
                height: `${height}px`,
            };
            if (load) {
                style.fontFamily = CommonGetFontName();
                style.visibility = visibility;
            }

            const elem = document.getElementById(id) as HTMLElement;
            Object.assign(elem.style, style);
        }
    }

    /** Called when this screen is being replaced */
    unload() {
        document.activeElement?.dispatchEvent(new FocusEvent("blur"));
        for (const id of keys(this.screenParams)) {
            const elem = document.getElementById(id);
            if (elem !== null) {
                elem.style.visibility = "hidden";
            }
        }
    }

    /** Called when user presses Esc */
    exit() {
        document.activeElement?.dispatchEvent(new FocusEvent("blur"));
        for (const id of keys(this.screenParams)) {
            ElementRemove(id);
        }
    }

    /** Called when screen is loaded */
    load(): void {
        const prevScreen = CurrentScreen;
        CurrentScreenFunctions?.Unload?.();
        if (ControllerIsActive()) {
            ControllerClearAreas();
        }

        CurrentScreen = this.screen;
        CurrentScreenFunctions = this.getFunctions();
        CurrentDarkFactor = 1.0;
        CommonGetFont.clearCache();
        CommonGetFontName.clearCache();
        CurrentScreenFunctions?.Resize?.(true);
        if (prevScreen == "ChatSearch" || prevScreen == "ChatCreate") {
            ChatRoomStimulationMessage("Walk");
        }
    }

    loadChild<T extends readonly any[], RT extends MBSScreen>(
        screenType: new (parent: null | MBSScreen, ...args: T) => RT, ...args: T
    ): RT {
        if (this.child) {
            this.child.exit();
        }
        this.child = new screenType(this, ...args);
        this.child.load();
        return this.child as RT;
    }

    run?(time: number): void;
    draw?(): void;
    click?(event: MouseEvent | TouchEvent): void;

    /**
     * Helper function for exiting all parents.
     * @param fullExit Whether to exit all (nested) {@link MBSScreen.parent} instance or,
     * otherwise, just load the parnt if it exists
     */
    protected exitScreens(fullExit: boolean): void {
        let parent = this.parent;
        let child = this.child;

        // Ensure that all child screens (if available) are exited
        while (child?.child != null) {
            child = child.child;
        }
        while (child && child !== this) {
            child.child = null;
            child.exit();
            child = child.parent;
        }

        if (fullExit) {
            while (parent !== null && !(parent instanceof ScreenProxy)) {
                parent.child = null;
                parent.exit();
                parent = parent.parent;
            }
        }

        if (parent !== null) {
            parent.load();
            parent.child = null;
        }
    }

    /** Get an object with all {@link ScreenFunctions} and the screen background */
    getFunctions(): ScreenFunctions {
        return {
            Run: this.run?.bind(this) ?? CommonNoop,
            Draw: this.draw?.bind(this),
            Click: this.click?.bind(this) ?? CommonNoop,
            Load: this.load.bind(this),
            Unload: this.unload?.bind(this),
            Resize: this.resize?.bind(this),
            Exit: this.exit.bind(this),
        };
    }
}

export class ScreenProxy extends MBSScreen {
    readonly module: string;
    readonly background: string;
    readonly screenFunctions: Readonly<ScreenFunctions>;
    static readonly screenParamsDefault = {};

    constructor(
        parent: null | MBSScreen,
        module: string,
        background: string,
        screenFunctions: Readonly<ScreenFunctions>,
    ) {
        super(parent, ScreenProxy.screenParamsDefault, null);
        this.module = module;
        this.background = background;
        this.screenFunctions = Object.freeze({ ...screenFunctions });
    }

    run(time: number) { return this.screenFunctions.Run(time); }
    draw() { return this.screenFunctions.Draw?.(); }
    click(event: MouseEvent | TouchEvent) { return this.screenFunctions.Click(event); }
    load() { return this.screenFunctions.Load?.(); }
    unload() { return this.screenFunctions.Unload?.(); }
    resize(load: boolean) { return this.screenFunctions.Resize?.(load); }
    keyDown(event: KeyboardEvent) { return this.screenFunctions.KeyDown?.(event) ?? false; }
    exit() { return this.screenFunctions.Exit?.(); }
}

export type ExitAction = 0 | 1 | 2;

/** Various exit-related actions for {@link MBSObjectScreen.exit}. */
export const ExitAction = Object.freeze({
    /** Exit without any special actions. */
    NONE: 0,
    /** Save and exit. */
    SAVE: 1,
    /** Delete and exit. */
    DELETE: 2,
});

export abstract class MBSObjectScreen<
    T extends import("./common_bc").MBSObject<FWObjectOption>,
> extends MBSScreen {
    /** The selected settings for the screen's {@link MBSObjectScreen.mbsList} */
    abstract readonly settings: import("./common_bc").MBSSelectedObject<T>;
    /** The selected character */
    readonly character: Character;
    /** The screen's (fixed-size) list of fortune wheel objects */
    readonly mbsList: (null | T)[];
    /** The maximum and actually used size of {@link Character.OnlineSharedSettings} in KB */
    readonly dataSize: DataSize;
    /** The current index within {@link MBSObjectScreen.mbsList} */
    #index: number = 0;

    /** Get or set the current index within {@link MBSObjectScreen.mbsList} */
    get index(): number { return this.#index; }
    set index(value: number) {
        validateInt(value, "index", 0, this.mbsList.length - 1);
        this.#index = value;
    }
    /** Get current wheel object within {@link MBSObjectScreen.mbsList} */
    get mbsObject() { return this.mbsList[this.#index]; }

    hasStorageSpace(): boolean {
        if (this.mbsList[this.index] === null) {
            return this.dataSize.value <= (this.dataSize.max * this.dataSize.marigin);
        } else {
            return true;
        }
    }

    constructor(
        parent: null | MBSScreen,
        wheelList: (null | T)[],
        index: number,
        character: Character,
        screenParamsDefault: ScreenParams.Full,
        screenParams: null | ScreenParams.Partial,
    ) {
        super(parent, screenParamsDefault, screenParams);
        this.character = character;
        this.mbsList = wheelList;
        this.index = index;
        this.dataSize = Object.seal({
            value: 0,
            valueRecord: {},
            max: MAX_DATA,
            marigin: 0.9,
        });
    }

    load() {
        const nByte = measureDataSize(this.character.OnlineSharedSettings);
        this.dataSize.value = sumBy(Object.values(nByte), (i) => Number.isNaN(i) ? 0 : i);
        this.dataSize.valueRecord = nByte;
        super.load();
    }

    /**
     * Exit the customization screen.
     * @param fullExit Whether to return to the initial wheel of fortune screen.
     * @param action Whether to do nothing, save the custom item settings or delete to them.
     */
    exit(fullExit: boolean = true, action: ExitAction = ExitAction.NONE): void {
        super.exit();
        if (!this.character.IsPlayer()) {
            return this.exitScreens(fullExit);
        }

        switch (action) {
            case ExitAction.NONE:
                break;
            case ExitAction.SAVE: {
                if (this.settings.isValid(this.index) && this.hasStorageSpace()) {
                    this.mbsList[this.index] = this.settings.writeSettings();
                    this.mbsList[this.index]?.register();
                }
                break;
            }
            case ExitAction.DELETE: {
                const option = this.mbsList[this.index];
                this.mbsList[this.index] = null;
                option?.unregister();
                break;
            }
            default:
                throw new Error(`Unsupported action: ${action}`);
        }
        this.exitScreens(fullExit);
    }
}
