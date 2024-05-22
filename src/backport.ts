/** Backports of R91 bug fixes */

import { sortBy } from "lodash-es";

// @ts-ignore
import { MBS_MOD_API } from "./common";
import { waitFor, logger } from "./common";
import { bcLoaded } from "./common_bc";
import { BC_MIN_VERSION } from "./sanity_checks";

/** The next BC version */
const BC_NEXT = BC_MIN_VERSION + 1;

/** A set with the pull request IDs of all applied bug fix backports */
export const backportIDs: Set<number> = new Set();

waitFor(bcLoaded).then(() => {
    switch (GameVersion) {
        case "R104": {
            if (MBS_MOD_API.getOriginalHash("PreferenceSubscreenExtensionsClear") === "BA474ADD") {
                backportIDs.add(5052);
                MBS_MOD_API.patchFunction("PreferenceSubscreenExtensionsClear", {
                    ["PreferenceExtensionsCurrent.unload();"]:
                        "PreferenceExtensionsCurrent.unload?.();",
                });
            }

            if (MBS_MOD_API.getOriginalHash("AppearanceClick") === "4E3937AA") {
                backportIDs.add(5055);
                MBS_MOD_API.patchFunction("AppearanceClick", {
                    ["const asset = CharacterAppearanceNextItem(C, Group.Name, MouseX > 1500);"]:
                        "const asset = CharacterAppearanceNextItem(C, Group.Name, MouseX > 1410);",
                });
            }

            // `patchFunction` doesnt play nice with bound methods, so use a dirty override instead
            if (MBS_MOD_API.getOriginalHash("Layering._ApplyAssetPriority") === "B738E4DD") {
                backportIDs.add(5055);
                Layering._ApplyAssetPriority = function _ApplyAssetPriority(this: typeof Layering, priority: number, defaultPriority: string) {
                    const old = this.OverridePriority;
                    if (!Number.isInteger(old)) {
                        this._UpdateInputColors("asset-priority");
                    }

                    if (!Number.isNaN(priority) && priority.toString() !== defaultPriority) {
                        this.OverridePriority = CommonClamp(Math.round(priority), -99, 99);
                    } else {
                        // @ts-ignore
                        this.OverridePriority = undefined;
                    }

                    if (old !== this.OverridePriority) {
                        this._CharacterRefresh(this.Character as Character, false, false);
                    }
                }.bind(Layering);
            }

            if (MBS_MOD_API.getOriginalHash("DialogMenuButtonBuild") === "AC1C6466") {
                backportIDs.add(5055);
                MBS_MOD_API.patchFunction("DialogMenuButtonBuild", {
                    ["if (Item != null && !C.IsNpc() && Player.CanInteract()) {"]:
                        "if (Item != null && !C.IsNpc() && (InventoryItemHasEffect(Item, 'Lock') ? DialogCanUnlock(C, Item) : Player.CanInteract())) {",
                });
            }

            break;
        }
    }

    if (backportIDs.size) {
        logger.log(`Initializing R${BC_NEXT} bug fix backports`, sortBy(Array.from(backportIDs)));
    } else {
        logger.log(`No R${BC_NEXT} bug fix backports`);
    }
});
