import { isArray } from "../common";

export function factory<T1 extends Event, T2 extends any[], RT>(
    func: (event: T1, ...args: T2) => RT, ...args: T2
): ((event: T1) => RT) {
    return function(this: HTMLElement, event: T1) {
        return func.bind(this)(event, ...args);
    };
}

export function getCraft(item: Item): CraftingItem {
    return {
        Name: item.Asset.Description,
        Item: item.Asset.Name,
        Description: "",
        Lock: "",
        Property: "Normal",
        Private: true,
        Color: "",
        ItemProperty: null,
    };
}

export function validateColor(asset: Asset, color?: unknown): string[] {
    const colorSchema = asset.Group.ColorSchema;
    const ret = [...asset.DefaultColor];
    if (typeof color === "string" && (CommonIsColor(color) || colorSchema.includes(color))) {
        ret.fill(color);
    } else if (isArray(color)) {
        color.slice(0, asset.ColorableLayerCount).forEach((c, i) => {
            if (typeof c === "string" && (CommonIsColor(c) || colorSchema.includes(c))) {
                ret[i] = c;
            }
        });
    }
    return ret;
}

export async function updatePreview(character: Character, items?: Partial<Record<AssetGroupName, Item>>) {
    if (items) {
        character.Appearance = Player.Appearance.filter(i => i.Asset.Group.IsAppearance() && !i.Asset.Group.AllowNone);
        for (const item of Object.values(items)) {
            const itemNew = CharacterAppearanceSetItem(character, item.Asset.Group.Name, item.Asset, item.Color, undefined, undefined, false);
            if (itemNew) {
                itemNew.Property = item.Property;
            }
        }
    } else {
        character.Appearance = Player.Appearance.filter(i => i.Asset.Group.IsAppearance());
    }
    CharacterRefresh(character, false, false);
}
