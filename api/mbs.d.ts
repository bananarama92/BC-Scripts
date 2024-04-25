/**
 * MBS: Maid's Bondage Scripts
 *
 * Copyright (C) 2023-2024 Bananarama92
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of
 * the GNU General Public License as published by the Free Software Foundation,
 * either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see https://www.gnu.org/licenses/.
 */

/**
 * Uncomment the declarations below if, for one reason or another, you do not
 * have access to the builtin BC type annotations.
 *
 * Use of the builtin BC types is *strongly* recommended.
 */
// type AssetLockType = string;
// type TypeRecord = Record<string, number>;
// type ItemBundle = Record<string, any>;
// type CraftingItem = Record<string, any>;
// type ItemProperties = Record<string, any>;
// type Asset = Record<string, any>;
// type Item = Record<string, any>;
// type Character = Record<string, any>;

/** An interface for exposing MBS wheel of fortune data */
interface WheelBundle {
    /** The (user-specified) name of the item set. */
    name: string;
    /** The index of the wheel of fortune item set */
    index: number;
    /** A list of the minified items associated with the item set */
    items: ItemBundle[];
}

/**
 * An interface with all available MBS style options.
 *
 * Note that the option's exact default values are *not* guaranteed by the API, and
 * may by changed at any point in the future without an increment of the API version.
 */
interface CSSStyles {
    /**
     * The background color used for _most_ `div` elements (if they have a background).
     * @default "white"
     */
    backgroundColor: string;
    /**
     * The background color used for `button` elements.
     * @default "white"
     */
    buttonColor: string;
    /**
     * The background color used when hovering over `button` elements.
     * @default "cyan"
     */
    buttonHoverColor: string;
    /**
     * The background color used for tooltips.
     * @default "lightyellow"
     */
    tooltipColor: string;
    /**
     * The color used for borders.
     * @default "black"
     */
    borderColor: string;
    /**
     * The color used for borders.
     * @default "black"
     */
    textColor: string;
}

/** A namespace with various types related to MBS wheel of fortune events */
declare namespace WheelEvents {
    /** A namespace with all available events */
    export namespace Events {
        export interface Base {
            /** The name of the wheel of fortune outfit */
            readonly name: string;
            /**
             * The target character.
             *
             * Note that this can be either a player character _or_ a simple character (see {@link Character.IsSimple}),
             * the latter case being relevant for preview character in the wheel config menu.
             */
            readonly character: Character;
        }

        export interface ItemBase extends Base {
            /** The to-be equipped asset */
            readonly newAsset: Asset;
            /** The previously equipped item (if any) */
            readonly oldItem: null | Item;
        }

        /**
         * Fired before any item (un-)equipping, after validating that the character is not blocked by an `enclosed` effect
         */
        export interface BeforeOutfitEquip extends Base {}

        /**
         * Fired before equipping an item in order to determine whether it will be equipped or not.
         *
         * The relevant {@link Options.listener} must return a string value with an error message if the item is _not_ to-be equipped, and `null` otherwise.
         */
        export interface ValidateItemEquip extends ItemBase {}

        /** Fired before equipping an item after it has been succesfully validated.  */
        export interface BeforeItemEquip extends ItemBase {
            /** The to-be equipped lock (if any) */
            readonly lock: null | AssetLockType;
            /** The color of the to-be equipped item */
            color: null | string[];
            /** Extra item properties to be added to the item in addition to those determined by the {@link typeRecord} of extended items */
            properties: null | ItemProperties;
            /** A modifier to the item's difficulty */
            difficultyModifier: null | number;
            /** The item's type record for when extended items are involved */
            typeRecord: null | TypeRecord;
            /**
             * Crafted item info to-be attached to the item.
             * Note that only the `Name`, `Description` and `Property` fields are supported.
             */
            craft: null | Pick<CraftingItem, "Name" | "Description" | "Property">;
        }

        /**
         * Fired after equipping an item.
         *
         * Note that, if possible, usage of the `beforeItemEquip` hook ({@link BeforeItemEquip}) is generally recommended.
         */
        export interface AfterItemEquip extends ItemBase {
            readonly newItem: Item;
        }

        /**
         * Fired after equipping all items.
         *
         * Only after all items have been equipped and all `afterOutfitEquip` hooks have run their course will the updated outfit be sent to the server and synced with the rest of the chat room.
         */
        export interface AfterOutfitEquip extends Base {
        }

        /** A mapping with all available event types mapped to their respective events */
        export interface Mapping {
            beforeOutfitEquip: Events.BeforeOutfitEquip;
            validateItemEquip: Events.ValidateItemEquip;
            beforeItemEquip: Events.BeforeItemEquip;
            afterItemEquip: Events.AfterItemEquip;
            afterOutfitEquip: Events.AfterOutfitEquip;
        }

        /** The names of all available events */
        export type Names = keyof Mapping;
    }

    /**
     * Namespace with configuration options for granting end users access to event-specific keyword arguments.
     *
     * Comes in 5 general flavors:
     * * `checkbox`: An argument with a boolean value; corresponds to a `<input type="checkbox" />` element
     * * `number`: An argument with a number value; corresponds to a `<input type="number" />` element
     * * `text`: An argument with a string value; corresponds to a `<input type="text" />` element
     * * `select`: An argument with a single strings value from a set of available options; corresponds to a `<select />` element
     * * `select-multiple`: An argument with one or more strings values from a set of available options; corresponds to a `<select multiple />` element
     *
     * @see {@link Kwargs} the final keyword arguments as specified by the end user
     */
    export namespace KwargsConfig {
        interface Base {
            /** A unique identifier for the type of to-be create DOM element. */
            readonly type: Names;
            /** A user-facing label describing the element */
            readonly label: string;
        }

        /**
         * Input options for creating a `<input type="checkbox" />` element.
         * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/checkbox
         */
        export interface Checkbox extends Base {
            readonly type: "checkbox";
            /** The default state of the checkbox: checked or unchecked */
            readonly default: boolean;
        }

        /**
         * Input options for creating a `<select />` element.
         * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select
         */
        export interface Select extends Base {
            readonly type: "select";
            /** Whether at least one option _must_ be selected */
            readonly required?: boolean;
            readonly size?: number;
            readonly options: readonly {
                /** A user-facing label describing the option */
                readonly label: string;
                /** An internal id of the option; defaults to {@link label} */
                readonly value?: string;
                /** The default state of the option: selected or unselected (default) */
                readonly default?: boolean;
                /** A user-facing name of the `<optgroup>` that this option belongs to (if any) */
                readonly group?: string;
            }[];
        }

        /**
         * Input options for creating a `<select multiple />` element.
         * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select#multiple
         */
        export interface SelectMultiple extends Omit<Select, "type"> {
            /** A unique identifier for the type of to-be create DOM element. */
            readonly type: "select-multiple";
        }

        /**
         * Input options for creating a `<input type="number" />` element.
         * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/number
         */
        export interface Number extends Base {
            readonly type: "number";
            /** The default input value */
            readonly default: number;
            /** The input's minimum value */
            readonly min: number;
            /** The input's maximum value */
            readonly max: number;
            /** The input's incrementation step size */
            readonly step?: number;
            /**
             * The input's input mode; `numeric` representing integer-only values while `decimal` allows arbitrary floats.
             * Defaults to `numeric` if no non-integer numbers are present in the default, min, max and step, and `decimal` otherwise.
             */
            readonly inputmode?: "numeric" | "decimal";
            /** A list of user-facing value suggestions */
            readonly suggestions?: readonly number[];
        }

        /**
         * Input options for creating a `<input type="text" />` element.
         * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/text
         */
        export interface Text extends Base {
            readonly type: "text";
            /** The default input value */
            readonly default: string;
            /** The minimum value length */
            readonly minlength?: number;
            /** The maximum value length */
            readonly maxlength?: number;
            /** A regex pattern for validating the input */
            readonly pattern?: string | RegExp;
            /** Whether to enable spell checking or not */
            readonly spellcheck?: boolean;
            /** A list of user-facing value suggestions */
            readonly suggestions?: readonly string[];
        }

        /** Union of all valid {@link KwargsConfig} keyword argument config types */
        export type All = Select | SelectMultiple | Checkbox | Text | KwargsConfig.Number;

        /** An interface mapping kwargs config types to their respective kwarg config */
        export interface Mapping {
            text: Text,
            number: number,
            checkbox: Checkbox,
            select: Select,
            "select-multiple": SelectMultiple,
        }

        /** The type names of all available kwargs */
        export type Names = keyof Mapping;
    }

    /**
     * Namespace with keyword arguments as specified by the end user.
     *
     * @see {@link KwargsConfig} configuration options for keyword arguments, defining allowed arguments and any and all of their limitations
     */
    export namespace Kwargs {
        interface Base {
            /** A unique identifier for the type of argument. */
            readonly type: Names;
            /** A {@link type}-specific value as configured by the end user. */
            readonly value: unknown;
            /**
             * A {@link type}-specific state.
             * Currently only used for summarizing the amount of selected options in {@link SelectMultiple} kwargs.
             */
            readonly state?: string;
        }

        /** User-generated keyword argument according to the limits imposed by {@link KwargsConfig.Text}. */
        export interface Text extends Base {
            readonly type: "text";
            readonly value: string;
            readonly state?: never;
        }

        /** User-generated keyword argument according to the limits imposed by {@link KwargsConfig.Number}. */
        export interface Number extends Base {
            readonly type: "number";
            readonly value: number;
            readonly state?: never;
        }

        /** User-generated keyword argument according to the limits imposed by {@link KwargsConfig.Checkbox}. */
        export interface Checkbox extends Base {
            readonly type: "checkbox";
            readonly value: boolean;
            readonly state?: never;
        }

        /** User-generated keyword argument according to the limits imposed by {@link KwargsConfig.Select}. */
        export interface Select extends Base {
            readonly type: "select";
            readonly value: undefined | string;
            readonly state?: never;
        }

        /** User-generated keyword argument according to the limits imposed by {@link KwargsConfig.SelectMultiple}. */
        export interface SelectMultiple extends Base {
            readonly type: "select-multiple";
            readonly value: ReadonlySet<string>;
            readonly state: "all" | "some" | "none";
        }

        /** Union of all valid {@link Kwargs} keyword argument types */
        export type All = Select | SelectMultiple | Checkbox | Text | Kwargs.Number;

        export interface SelectMultipleJson extends Omit<SelectMultiple, "value"> {
            readonly value: readonly string[];
        }

        export type JsonAll = Select | SelectMultipleJson | Checkbox | Text | Kwargs.Number;

        /** An interface mapping kwarg types to their respective kwarg */
        export interface Mapping {
            text: Text,
            number: number,
            checkbox: Checkbox,
            select: Select,
            "select-multiple": SelectMultiple,
        }

        /** The type names of all available kwarg configs */
        export type Names = keyof Mapping;
    }

    /** An interface with event-specific return types */
    interface ListenerReturnType extends Record<Events.Names, unknown> {
        beforeOutfitEquip: null;
        validateItemEquip: null | string;
        beforeItemEquip: null;
        afterItemEquip: null;
        afterOutfitEquip: null;
    }

    /**
     * @param event The event
     * @param kwargs An object with further options as configured by the end user according to the limits as specified in {@link Options.kwargs}.
     */
    export type Listener<EventType extends Events.Names> = (
        event: Events.Mapping[EventType],
        kwargs: Partial<Readonly<Record<string, Kwargs.All>>>,
    ) => void | undefined | ListenerReturnType[EventType];

    /** Registration options for a to-be registered event listener */
    export interface Options<EventType extends Events.Names> {
        /**
         * The to-be registered callback of the hook.
         * @param event The event object
         * @param kwargs An object with further options as configured by the end user, allowed keys (and their values) being configured by {@link kwargs}.
         * @returns A nullish value
         */
        readonly listener: Listener<EventType>,
        /**
         * The internal ID to-be assigned to the hook.
         *
         * Note that the name _must_ be unique for a given addon/event type pair.
         */
        readonly hookName: string,
        /**
         * A user-facing short, ~1 line summary of the hook (_i.e._ an aria [label](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-labelledby)).
         *
         * Can be passed as either a simple string or one or more (non-interactive!) DOM elements.
         */
        readonly label: string | HTMLElement | readonly (string | HTMLElement)[],
        /**
         * A user-facing longer, potentially multi-line description of the hook (_i.e._ an aria [description](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-describedby)).
         *
         * Should be provided if the {@link label} requires further supplementation.
         *
         * Can be passed as either a simple string or one or more (non-interactive!) DOM elements.
         */
        readonly description?: string | HTMLElement | readonly (string | HTMLElement)[],
        /**
         * A record with configuration options for the allowed keyword arguments to-be passed to {@link listener}.
         *
         * @see {@link KwargsConfig} An overview of all available argument types
         */
        readonly kwargs?: Readonly<Record<string, KwargsConfig.All>>,
    }
}

/**
 * Maid's Bondage Scripts API: Various additions and utility scripts for BC.
 * @version 1.3
 */
declare namespace mbs {
    /**
     * The (semantic) MBS version.
     * Guaranteed to match the `/^([0-9]+)\.([0-9]+)\.([0-9]+)(\.\S+)?$/` regex.
     *
     * @since API version 1.0
     */
    const MBS_VERSION: `${number}.${number}.${number}${string}`;

    /**
     * The version of the MBS API.
     *
     * - Changes or removals are accompanied by a `major` increment (and resetting `minor` back to 0)
     * - Additions are only accompanied by a `minor` increment
     * - Documentation changes can be implemented without incrementing `major` or `minor`
     *
     * @since API version 1.0
     */
    const API_VERSION: {
        /** The major API versions; increments are reserved for changes and removals */
        readonly major: number,
        /** The major API versions; increments are reserved for additions */
        readonly minor: number,
    };

    /**
     * Run the MBS test suit.
     *
     * @since API version 1.0
     * @returns Whether the test suite succeeded or not
     */
    function runTests(): boolean;

    /**
     * Return MBS debug output in human-readable, stringified form.
     *
     * Note that the API provides no guarantees regarding the outputs machine readability.
     * While the output type is guaranteed by the API, the exact value is not and MBS is free to change it at any point without prior warning.
     *
     * As of API version 1.2 the output string is guaranteed to be JSON-safe (see {@link JSON.parse})
     *
     * @since API version 1.1
     * @returns The MBS debug output in stringified form
     */
    function getDebug(): string;

    /**
     * Public MBS API for retrieving wheel outfit data.
     *
     * @since API version 1.0
     */
    namespace wheelOutfits {
        /**
         * Get a record mapping all (user-specified) outfit names to the actual outfit data.
         *
         * @since API version 1.0
         * @returns All MBS outfit data
         */
        function getAll(): Record<string, WheelBundle>;

        /**
         * Get a single wheel outfit by its name.
         *
         * @since API version 1.0
         * @param name The name of the wheel outfit
         * @returns The wheel outfit or `undefined` if it cannot be found
         */
        function getByName(name: string): undefined | WheelBundle;

        /**
         * Get a single wheel outfit by its index.
         *
         * @since API version 1.0
         * @param index The wheel outfit or `undefined` if it cannot be found
         * @returns The MBS outfit data or `undefined`
         */
        function getByIndex(index: number): undefined | WheelBundle;

        /**
         * Return a list of all the players wheel outfit names.
         *
         * @since API version 1.0
         * @returns The list of wheel outfit names
         */
        function getNames(): string[];

        /**
         * Return a list of all the players wheel outfit indices.
         *
         * @since API version 1.0
         * @returns The list of wheel outfit indices
         */
        function getIndices(): number[];
    }

    /**
     * Public MBS API for registering wheel of fortune event listeners.
     *
     * @since API version 1.5
     */
    namespace wheelEvents {
        /**
         * Register a wheel of fortune event listener for the specified
         * @param hookType The type of to-be registered event listener
         * @param addonName The `name` of the bcModSdk-registered addon that wants to register the event listener
         * @param options Registration options for the event listener
         */
        function addEventListener<EventType extends WheelEvents.Events.Names>(
            hookType: EventType,
            addonName: string,
            options: WheelEvents.Options<EventType>,
        ): void;

        /**
         * Get all registered event listeners.
         * @returns An object mapping addon names, to event listener types, to a set of all its registered listener names.
         */
        function listEventListeners(): Record<string, Partial<Record<WheelEvents.Events.Names, Set<string>>>>;
    }

    /**
     * Public API for modifying MBS's style sheets.
     *
     *
     * Licensed under LGPL-v3 as of API version 1.4
     * @since API version 1.3
     * @license LPGL-v3
     */
    namespace css {
        /**
         * Set the passed MBS style options.
         *
         * @since API version 1.3
         * @param style A record with one or more of the to-be assigned style options
         */
        function setStyle(style: Readonly<Partial<CSSStyles>>): void;

        /**
         * Get the currently assigned MBS style options.
         *
         * @since API version 1.3
         * @returns A record with the currently assigned style options
         */
        function getStyle(): CSSStyles;

        /**
         * The default MBS style options.
         *
         * @since API version 1.3
         */
        const DEFAULT_STYLE: Readonly<CSSStyles>;
    }
}
