import { flatten } from "lodash-es";

import { FWItemSet } from "../common_bc";
import { FORTUNE_WHEEL_ITEM_SETS, fromItemBundle } from "../fortune_wheel";

import { assertEqual, assert, PASSES } from "./testing_tools";

type filterCallback = (wheelItem: FWItem, character: Character) => null | FWItem;

const OptionFilters = Object.freeze(<Record<string, filterCallback>>{
    Mummification: (wheelItem) => {
        return { ...wheelItem, TypeRecord: undefined };
    },
});

export function test_builtinMBSWheel(): void {
    const name = "test_builtinMBSWheel";

    const options = flatten(Object.values(FORTUNE_WHEEL_ITEM_SETS).map(i => i.children ?? []));
    const characterNames = options.map(i => i.Description);
    const characters = characterNames.map(i => CharacterLoadSimple(i));

    try {
        options.forEach(option => {
            if (!(option.Parent instanceof FWItemSet)) {
                return;
            }
            const character = CharacterLoadSimple(option.Description);
            option.Script(character);
            for (let wheelItemRef of option.Parent.itemList) {
                const item = <Item>InventoryGet(character, wheelItemRef.Group);
                if (wheelItemRef.Equip !== undefined) {
                    continue;
                }
                assert(`${name}:${option.Description}:${wheelItemRef.Group}:${wheelItemRef.Name}:${PASSES}`, item != null);

                const itemFilter = OptionFilters[option.Parent.name] ?? (i => i);
                const wheelItem = itemFilter(
                    fromItemBundle(
                        item.Asset,
                        {
                            ...item,
                            Group: item.Asset.Group.Name,
                            Name: item.Asset.Name,
                            Color: wheelItemRef.Color === undefined ? undefined : item.Color,
                        },
                        false,
                    ),
                    character,
                );
                if (wheelItem === null) {
                    continue;
                }

                wheelItemRef = {
                    ...wheelItemRef,
                    Property: { ...wheelItem.Property, ...wheelItemRef.Property },
                    Equip: undefined,
                    Craft: (
                        wheelItemRef.Craft !== undefined
                        && option.Flag.type === "HighSecurityPadlock"
                        && InventoryDoesItemAllowLock(item)
                    ) ? { ...wheelItemRef.Craft, Property: "Puzzling" } : wheelItemRef.Craft,
                };

                assertEqual(
                    `${name}:${option.Description}:${wheelItemRef.Group}:${wheelItemRef.Name}:${PASSES}`,
                    wheelItem, wheelItemRef,
                );
            }
        });
    } finally {
        characters.forEach(c => CharacterDelete(c));
    }
}
