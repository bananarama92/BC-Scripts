/** Main module for managing all crafting-related additions */

"use strict";

import { MBS_MOD_API, waitFor, padArray, getFunctionHash, Version } from "common";
import { settingsMBSLoaded } from "common_bc";
import { pushMBSSettings } from "settings";

let CRAFTING_SLOT_MAX_ORIGINAL: number;
let R94BETA1_OR_LATER: boolean;

/** Serialize the passed crafting items. */
function craftingSerialize(items: null | readonly (null | CraftingItem)[]): string {
    if (items == null) {
        return "";
    }
    return items.map(C => {
        let P = "";
        if (C?.Item) {
            P += C.Item + "¶";
            P += (C.Property == null ? "" : C.Property) + "¶";
            P += (C.Lock == null ? "" : C.Lock) + "¶";
            P += (C.Name == null ? "" : C.Name.replace("¶", " ").replace("§", " ")) + "¶";
            P += (C.Description == null ? "" : C.Description.replace("¶", " ").replace("§", " ")) + "¶";
            P += (C.Color == null ? "" : C.Color.replace("¶", " ").replace("§", " ")) + "¶";
            P += ((C.Private != null && C.Private) ? "T" : "") + "¶";
            P += (C.Type == null ? "" : C.Type.replace("¶", " ").replace("§", " ")) + "¶";

            if (R94BETA1_OR_LATER) {
                P += "¶";
                P += (C.ItemProperty == null ? "" : JSON.stringify(C.ItemProperty)) + "§";
            } else {
                P += ((C.OverridePriority == null) ? "" : C.OverridePriority.toString()) + "§";
            }
        }
        return P;
    }).join("§");
}

waitFor(() => typeof CraftingSlotMax !== "undefined").then(() => {
    CraftingSlotMax = 160;
    console.log("MBS: Initializing crafting module");
});

waitFor(settingsMBSLoaded).then(() => {
    console.log("MBS: Initializing crafting hooks");

    R94BETA1_OR_LATER = (Version.fromBCVersion(GameVersion) > Version.fromBCVersion("R93")) || (
        getFunctionHash(CraftingModeSet) === "0EF1B752"
        && getFunctionHash(CraftingSaveServer) === "B5299AB2"
    );
    CRAFTING_SLOT_MAX_ORIGINAL = R94BETA1_OR_LATER ? 80 : 40;

    // Mirror the extra MBS-specific crafted items to the MBS settings
    MBS_MOD_API.hookFunction("CraftingSaveServer", 0, (args, next) => {
        next(args);
        Player.MBSSettings.CraftingCache = craftingSerialize(Player.Crafting ? Player.Crafting.slice(CRAFTING_SLOT_MAX_ORIGINAL) : null);
        pushMBSSettings();
    });

    MBS_MOD_API.patchFunction("DialogDrawCrafting", {
        '1000, 0, 975 - DialogMenuButton.length * 110, 125, "White", null, 3':
            '1000, 0, 975 - DialogMenuButton.length * 110, 125, "White", null, 2',

        '1050, 200, 900, 125, "White", null, 3':
            '1050, 150, 900, 125, "White", null, 2',

        '1050, 400, 900, 125, "White", null, 3':
            '1050, 300, 900, 125, "White", null, 2',

        '1050, 600, 900, 125, "White", null, 3':
            '1050, 450, 900, 125, "White", null, 2',

        '1050, 800, 900, 125, "White", null, 3':
            '1050, 600, 900, 215, "White", null, 7',
    });

    MBS_MOD_API.patchFunction("CraftingModeSet", {
        'ElementCreateInput("InputDescription", "text", "", "100");':
            'ElementCreateInput("InputDescription", "text", "", "200");',
    });

    if (Player.Crafting == null) {
        Player.Crafting = [];
    }
    if (
        Player.Crafting.length <= CRAFTING_SLOT_MAX_ORIGINAL
        && Player.MBSSettings.CraftingCache.length !== 0
    ) {
        padArray(Player.Crafting, CRAFTING_SLOT_MAX_ORIGINAL, null);

        let refresh = false;
        const packet = LZString.compressToUTF16(Player.MBSSettings.CraftingCache);
        const data = CraftingDecompressServerData(packet);
        for (const item of data) {
            // Make sure that the item is a valid craft
            switch (CraftingValidate(item)) {
                case CraftingStatusType.OK:
                    Player.Crafting.push(item);
                    break;
                case CraftingStatusType.ERROR:
                    Player.Crafting.push(item);
                    refresh = true;
                    break;
                case CraftingStatusType.CRITICAL_ERROR:
                    Player.Crafting.push(null);
                    refresh = true;
                    break;
            }

            // Too many items, skip the rest
            if (Player.Crafting.length >= CraftingSlotMax) {
                break;
            }
        }
        /**
         * One or more validation errors were encountered that were successfully resolved;
         * push the fixed items back to the server */
        if (refresh) {
            CraftingSaveServer();
        }
    }
});
