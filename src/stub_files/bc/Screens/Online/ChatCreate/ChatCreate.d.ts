/**
 * Loads the chat creation screen properties and creates the inputs
 * @returns {void} - Nothing
 */
declare function ChatCreateLoad(): void;
/**
 * When the chat creation screen runs, draws the screen
 * @returns {void} - Nothing
 */
declare function ChatCreateRun(): void;
/**
 * Handles the click events on the chat creation screen. Is called from CommonClick()
 * @returns {void} - Nothing
 */
declare function ChatCreateClick(): void;
/**
 * Handles the key presses while in the creation screen. When the user presses enter, we create the room.
 * @returns {void} - Nothing
 */
declare function ChatCreateKeyDown(): void;
/**
 * Handles exiting from the chat creation screen, removes the inputs and resets the state of the variable
 * @returns {void} - Nothing
 */
declare function ChatCreateExit(): void;
/**
 * Handles the reception of the server response after attempting to create a chatroom: shows the error message, if applicable
 * @param {string} data - Response from the server
 * @returns {void} - Nothing
 */
declare function ChatCreateResponse(data: string): void;
/**
 * Sends the chat room data packet to the server and prepares the player to join a room. The response will be handled by ChatCreateResponse once it is received
 * @returns {void} - Nothing
 */
declare function ChatCreateRoom(): void;
/**
 * When we need to enter the item blocking screen
 * @returns {void} - Nothing
 */
declare function ChatCreateBlockItems(): void;
/**
 * Removes all chatroom creation inputs
 */
declare function ChatRoomCreateRemoveInput(): void;
declare var ChatCreateBackground: string;
declare var ChatCreateResult: any[];
declare var ChatCreateMessage: string;
/** @type {null | boolean} */
declare var ChatCreatePrivate: null | boolean;
/** @type {null | boolean} */
declare var ChatCreateLocked: null | boolean;
declare var ChatCreateGame: string;
declare var ChatCreateGameList: string[];
declare var ChatCreateBackgroundIndex: number;
declare var ChatCreateBackgroundSelect: string;
/** @type {null | string[]} */
declare var ChatCreateBackgroundList: null | string[];
declare var ChatCreateShowBackgroundMode: boolean;
declare var ChatCreateIsHidden: boolean;
declare var ChatCreateLanguage: string;
declare var ChatCreateLanguageList: string[];
