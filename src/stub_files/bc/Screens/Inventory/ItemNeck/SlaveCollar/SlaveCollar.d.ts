/** @type {ExtendedItemCallbacks.Init} */
declare function InventoryItemNeckSlaveCollarInit(C: Character, Item: Item, Push: boolean, Refresh: boolean): boolean;
/** @type {ExtendedItemCallbacks.Load} */
declare function InventoryItemNeckSlaveCollarLoad(): void;
/** @type {ExtendedItemCallbacks.Draw} */
declare function InventoryItemNeckSlaveCollarDraw(): void;
/** @type {ExtendedItemCallbacks.Click} */
declare function InventoryItemNeckSlaveCollarClick(): void;
/**
 * Sets the slave collar model
 * @type {TypedItemSetTypeCallback}
 */
declare function InventoryItemNeckSlaveCollarSetType(NewType: string): void;
declare var InventoryItemNeckSlaveCollarColorMode: boolean;
/** @type {ItemColor} */
declare var InventoryItemNeckSlaveCollarColor: ItemColor;
declare var InventoryItemNeckSlaveCollarOffset: number;
/** @type {{ Name: string, Property: ItemProperties & { Type: null | string }, Image: string }[]} */
declare var InventoryItemNeckSlaveCollarTypes: {
    Name: string;
    Property: ItemProperties & {
        Type: null | string;
    };
    Image: string;
}[];
