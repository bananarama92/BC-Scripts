declare const Character: readonly Character[];
declare const GameVersion: string;
declare const WheelFortuneOption: FortuneWheelOptionBase[];
declare let WheelFortuneDefault: string;
declare const Player: Character;
declare function CharacterNaked(C: Character): void;
declare function AssetGet(Family: string, Group: AssetGroupName, Name: string): null | Asset;
declare function InventoryBlockedOrLimited(C: Character, Item: Item, ItemType?: null | string): boolean;
declare function CharacterRefresh(C: Character, Push?: boolean, RefreshDialog?: boolean): void;
declare function ChatRoomCharacterUpdate(C: Character): void;
declare function InventoryWear(
    C: Character,
    AssetName: string,
    AssetGroup: AssetGroupName,
    ItemColor?: string | string[],
    Difficulty?: number,
    MemberNumber?: null | number,
    Craft?: null | CraftingItem,
): void;
declare function InventoryCraft(
    Source: Character,
    Target: Character,
    GroupName: AssetGroupName,
    Craft?: null | CraftingItem,
    Refresh?: boolean,
    ApplyColor?: boolean,
    CraftWarn?: boolean,
): void;
declare function InventoryGet(C: Character, AssetGroup: AssetGroupName): Item | null;
declare function InventoryGetLock(Item: Item): Item | null;
declare function InventoryLock(
    C: Character,
    Item: Item | string,
    Lock: Item | string,
    MemberNumber?: null | number | string,
    Update?: boolean,
): void;
declare function InventoryDoesItemAllowLock(item: Item): boolean;
declare const CurrentTime: number;
declare function CraftingValidate(
    Craft: CraftingItem,
    Asset?: Asset | null,
    Warn?: boolean,
): CraftingStatusType;
declare let TextScreenCache: TextCache | null;
declare function SkillGetWithRatio(SkillType: string): number;
declare const WheelFortuneCharacter: Character;
declare function InventoryWearCraft(Item: Item, Craft: CraftingItem): void;
declare function CharacterAppearanceSetItem(
    C: Character,
    Group: AssetGroupName,
    ItemAsset?: Asset,
    NewColor?: ItemColor,
    DifficultyFactor?: number,
    ItemMemberNumber?: number,
    Refresh?: boolean,
): void;
declare let CraftingSlotMax: number;
declare const ExtendedArchetype: {
	MODULAR: "modular",
	TYPED: "typed",
	VIBRATING: "vibrating",
	VARIABLEHEIGHT: "variableheight",
};
declare const TypedItemDataLookup: Record<string, TypedItemData>;
declare const ModularItemDataLookup: Record<string, ModularItemData>;
declare const VibratingItemDataLookup: Record<string, VibratingItemData>;
declare const VibratorModeOptions: {
    Standard: ExtendedItemOption[],
    Advanced: (ExtendedItemOption | {
        Name: string,
        Property: {
            Mode: VibratorMode,
            Intensity: number | (() => number),
            Effect: EffectName[] | ((Intensity: number) => EffectName[]),
        },
    })[]
};
declare function VibratorModeSetProperty(Item: Item, Property: any): void;
declare const VibratorModeOff: ExtendedItemOption;
declare function ModularItemParseCurrent(data: ModularItemData, type?: null | string): number[];
declare function ModularItemMergeModuleValues(
    data: ModularItemData,
    moduleValues: number[],
    BaselineProperty?: ItemProperties | null,
): ItemProperties;
declare const ItemVulvaFuturisticVibratorTriggers: string[];
declare function InventoryAllow(
    C: Character,
    asset: Asset,
    prerequisites?: string | string[],
    setDialog?: boolean,
): string;
declare function CommonCallFunctionByName(FunctionName: string, ...args: any): any;
declare function InventoryGroupIsBlocked(
    C: Character,
    GroupName?: AssetGroupName,
    Activity?: boolean,
): boolean;
declare const GameVersionFormat: RegExp;
