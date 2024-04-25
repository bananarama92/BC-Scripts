/** Functions for the parsing and (inter-)conversion of {@link ItemBundle} lists. */

import { cloneDeep, clone } from "lodash-es";

import { isArray, entries, isInteger, logger, keys } from "../common";

import { getBaselineProperty } from "./type_setting";

type PropValidator<T extends keyof ItemProperties> = (property: unknown, asset: Asset) => property is NonNullable<ItemProperties[T]>;
type PropMappingType = {[T in keyof ItemProperties]: PropValidator<T>};

/** Validation function for the {@link ItemProperties.OverrideHeight} property. */
function validateOverrideHeight(property: unknown, asset: Asset): property is AssetOverrideHeight {
    const data = VariableHeightDataLookup[`${asset.Group.Name}${asset.Name}`];
    if (data === undefined) {
        return false;
    }

    const p = <AssetOverrideHeight | null>property;
    return (
        p !== null
        && typeof p === "object"
        && Number.isInteger(p.Priority)
        && (
            typeof p.Height === "number"
            && p.Height <= data.maxHeight
            && p.Height >= data.minHeight
        )
        && (
            p.HeightRatioProportion == null
            || (
                typeof p.HeightRatioProportion === "number"
                && p.HeightRatioProportion >= 0
                && p.HeightRatioProportion <= 1
            )
        )
    );
}

/** Validation function for the {@link TextItemNames} properties. */
function validateText(field: TextItemNames, property: unknown, asset: Asset): property is string {
    if (typeof property !== "string" || !DynamicDrawTextRegex.test(property)) {
        return false;
    }

    const key = `${asset.Group.Name}${asset.Name}`;
    const [_, data] = entries(TextItemDataLookup).find(([k]) => k.includes(key)) ?? ["", null];
    return (
        data !== null
        && property.length <= (data.maxLength[field] ?? -1)
    );
}

/**
 * A record {@link ItemProperties} with validation functions.
 * Properties are limited to a subset that are not managed by the extended item type-setting machinery.
 */
const PROP_MAPPING = <Readonly<PropMappingType>>Object.freeze({
    OverridePriority: (p, a) => {
        if (isInteger(p)) {
            return true;
        } else if (CommonIsObject(p)) {
            const layers = a.Layer.map(l => l.Name);
            return entries(p).every(([k, v]) => layers.includes(k) && isInteger(v));
        } else {
            return false;
        }
    },
    Opacity: (p, a) => typeof p === "number" && p <= a.MaxOpacity && p >= a.MinOpacity,
    Text: (p, a) => validateText("Text", p, a),
    Text2: (p, a) => validateText("Text2", p, a),
    Text3: (p, a) => validateText("Text3", p, a),
    ShowText: (p, _) => typeof p === "boolean",
    TriggerValues: (p, _) => typeof p === "string" && p.split(",").length === ItemVulvaFuturisticVibratorTriggers.length,
    AccessMode: (p, _) => typeof p === "string" && ItemVulvaFuturisticVibratorAccessModes.includes(<"" | "ProhibitSelf" | "LockMember">p),
    PunishOrgasm: (p, _) => typeof p === "boolean",
    PunishStandup: (p, _) => typeof p === "boolean",
    Texts: (p, _) => {
        if (!Array.isArray(p)) {
            return false;
        }
        if (p.length < ItemDevicesLuckyWheelMinTexts || p.length > ItemDevicesLuckyWheelMaxTexts) {
            return false;
        }
        return p.every(i => typeof i === "string" && i.length <= ItemDevicesLuckyWheelMaxTextLength);
    },
    TargetAngle: (p, _) => typeof p === "number" && p >= 0 && p <= 360,
    OverrideHeight: validateOverrideHeight,
    PunishStruggle: (p, _) => typeof p === "boolean",
    PunishStruggleOther: (p, _) => typeof p === "boolean",
    PunishRequiredSpeechWord: (p, _) => typeof p === "string" && p.length <= 70,
    PunishProhibitedSpeechWords: (p, _) => typeof p === "string" && p.length <= 70,
    PunishSpeech: (p, _) => isInteger(p) && p >= 0 && p < FuturisticTrainingBeltSpeechPunishments.length,
    PunishRequiredSpeech: (p, _) => isInteger(p) && p >= 0 && p < FuturisticTrainingBeltSpeechPunishments.length,
    PunishProhibitedSpeech: (p, _) => isInteger(p) && p >= 0 && p < FuturisticTrainingBeltSpeechPunishments.length,
    PublicModeCurrent: (p, _) => isInteger(p) && p >= 0 && p < FuturisticTrainingBeltModes.length,
    PublicModePermission: (p, _) => isInteger(p) && p >= 0 && p < FuturisticTrainingBeltPermissions.length,
    ShockLevel: (p, _) => isInteger(p) && p >= 0 && p <= 2,
    PortalLinkCode: (p, _) => typeof p === "string" && PortalLinkCodeRegex.test(p),
});

/**
 * Extract, validate and return all properties that intersect with {@link PROP_MAPPING}.
 * @param asset The relevant asset
 * @param properties The properties in question
 */
function sanitizeProperties(asset: Asset, properties?: ItemProperties): ItemProperties {
    if (properties === null || typeof properties !== "object") {
        return {};
    }

    const validPropKeys: Set<keyof ItemProperties> = new Set(["OverridePriority"]);
    if (asset.Archetype) {
        const item: Item = { Asset: asset, Property: properties };
        const options = ExtendedItemGatherOptions(item);
        for (const option of options) {
            if (option.OptionType === "VariableHeightOption") {
                validPropKeys.add("OverrideHeight");
            }
            for (const key of keys(option.ParentData.baselineProperty ?? {})) {
                if (!CraftingPropertyExclude.has(key)) {
                    validPropKeys.add(key);
                }
            }
        }
    }

    const ret: ItemProperties = {};
    for (const [key, value] of entries(properties)) {
        const validate = PROP_MAPPING[key];
        if (value == null || !validPropKeys.has(key) || validate === undefined) {
            continue;
        }
        if (validate(value, asset)) {
            // @ts-ignore
            ret[key] = value;
        }
    }
    return ret;
}

/** A map with various {@link Asset} validation checks for {@link fromItemBundles}. */
const UNSUPPORTED_ASSET_CHECKS = Object.freeze(new Map([
    ["Unknown asset", (asset: null | Asset) => asset == null],
    ["Unsupported owner-only asset", (asset: null | Asset) => asset?.OwnerOnly],
    ["Unsupported lovers-only asset", (asset: null | Asset) => asset?.LoverOnly],
    ["Unsupported D/S family-only asset", (asset: null | Asset) => asset?.FamilyOnly],
    ["Unsupported disabled asset", (asset: null | Asset) => !asset?.Enable],
    ["Unsupported script-asset", (asset: null | Asset) => asset?.Group?.Category === "Script"],
]));

/**
 * Convert an item bundle into a wheel of fortune item.
 * @param asset
 * @param item The original bundled item
 * @param custom
 * @returns The new wheel of fortune item
 */
export function fromItemBundle(
    asset: null | Asset,
    item: ItemBundle,
    custom: boolean = true,
): FWItem {
    for (const [msgPrefix, validationCheck] of UNSUPPORTED_ASSET_CHECKS) {
        if (validationCheck(asset)) {
            throw new Error(`${msgPrefix}: ${item.Group}${item.Name}`);
        }
    }

    let color: undefined | readonly string[] = undefined;
    if (typeof item.Color === "string") {
        color = [item.Color];
    } else if (Array.isArray(item.Color) && item.Color.every(i => typeof i === "string")) {
        color = [...item.Color];
    }

    let craft: undefined | CraftingItem = undefined;
    if (item.Craft !== null && typeof item.Craft === "object") {
        craft = Object.assign(
            cloneDeep(item.Craft),
            {
                TypeRecord: undefined,
                OverridePriority: null,
                Lock: "",
            },
        );
        CraftingValidate(craft, asset, false);
    }

    const property = item.Property ?? {};
    let typeRecord: undefined | TypeRecord = undefined;
    if (CommonIsObject(property.TypeRecord)) {
        typeRecord = Object.freeze({ ...property.TypeRecord });
    } else if (typeof property.Type === "string" || property.Type === null) {
        typeRecord = ExtendedItemTypeToRecord(<Asset>asset, property.Type);
    } else if (typeof property.Mode === "string") {
        typeRecord = ExtendedItemTypeToRecord(<Asset>asset, property.Mode);
    }

    return Object.freeze({
        Name: item.Name,
        Group: item.Group,
        Custom: custom,
        Property: Object.freeze(sanitizeProperties(<Asset>asset, item.Property)),
        TypeRecord: typeRecord,
        Color: color,
        Craft: Object.freeze(craft),
        Equip: undefined,
    });
}

/**
 * Validate and convert a base64-deserialized {@link ItemBundle} or array thereof into a wheel of fortune item list.
 * @param items The original bundled item(s)
 * @returns The new list of wheel of fortune items
 */
export function fromItemBundles(items: ItemBundle | readonly ItemBundle[]): FWItem[] {
    if (!isArray(items)) {
        if (items !== null && typeof items === "object") {
            items = [items];
        } else {
            throw new TypeError(`Invalid "items" type: ${typeof items}`);
        }
    }

    // NOTE: Take extra care here as users can pass arbitrary arrays due to the handling of base64-decompressed data
    const ret: FWItem[] = [];
    const caughtErrors: Map<string, Error> = new Map();
    const groupsVisited: Set<AssetGroupName> = new Set();
    items.forEach((item, i)  => {
        let asset: null | Asset = null;
        try {
            asset = AssetGet("Female3DCG", item.Group, item.Name);
            const fwItem = fromItemBundle(asset, item);
            if (
                !groupsVisited.has(item.Group)
                && asset != null
                && (asset.Group.IsItem() || (asset.Group.IsAppearance() && asset.Group.AllowNone))
            ) {
                groupsVisited.add(item.Group);
                ret.push(fwItem);
            }
        } catch (ex) {
            let key = `${asset?.Group?.Name}${asset?.Name}`;
            if (key.includes("undefined")) {
                key = `Item ${i}`;
            }
            caughtErrors.set(key, <Error>ex);
        }
    });
    if (caughtErrors.size !== 0) {
        logger.log(`Failed to parse ${caughtErrors.size} of the provided items`, caughtErrors);
    }
    return ret;
}

/**
 * Convert a single wheel of fortune item into an item bundle
 * @param item The original wheel of fortune item
 * @param character
 */
export function toItemBundle(item: FWItem, character: Character): ItemBundle {
    const { Group, Name, Color, Craft, TypeRecord, Property } = item;
    const asset = AssetGet(character.AssetFamily, Group, Name);
    if (asset == null) {
        throw new Error(`Unknown asset: ${Group}${Name}`);
    }
    return {
        Group: Group,
        Name: Name,
        Color: clone(<string[] | undefined>Color),
        Craft: clone(Craft),
        Property: Object.assign(
            getBaselineProperty(asset, character, TypeRecord),
            cloneDeep(Property),
        ),
    };
}

/**
 * Convert wheel of fortune items into an item bundle
 * @param items The original wheel of fortune items
 * @param character
 */
export function toItemBundles(items: readonly FWItem[], character: Character): ItemBundle[] {
    if (!isArray(items)) {
        throw new TypeError(`Invalid "items" type: ${typeof items}`);
    }
    return items.map(item => toItemBundle(item, character));
}
