/** Various additions and utility scripts for BC */

import "tsx-dom";

import { waitFor, MBS_MOD_API, logger } from "./common";
import { validateBCVersion, validateHookHashes } from "./sanity_checks";
import { bcLoaded } from "./common_bc";
import { toItemBundles as _toItemBundles } from "./fortune_wheel";
import { unpackSettings as _unpackSettings } from "./settings";
import { wheelOutfits, getDebug, API_VERSION, css } from "./api";
import { runTests } from "./testing";

import styles from "./index.scss";

const _getFunctionHash = MBS_MOD_API.getOriginalHash;
const _version = MBS_VERSION;

export {
    runTests,
    _version as MBS_VERSION,
    API_VERSION,
    wheelOutfits,
    getDebug,
    css,
    _getFunctionHash,
    _toItemBundles,
    _unpackSettings,
};

logger.log(`Initializing MBS version ${MBS_VERSION}`);
waitFor(() => bcLoaded(false)).then(() => {
    validateBCVersion(GameVersion);
    validateHookHashes();
    document.body.appendChild(<style id="mbs-style">{styles.toString()}</style>);
});

import "./window_register";
import "./crafting";
import "./backport";
import "./new_items_screen";
import "./garbling";
import "./outfit";

// Workaround for checking whether mbs satisfies its declared interface
// Xref microsoft/TypeScript#38511
import * as __self__ from "./index";
__self__ satisfies typeof mbs;
