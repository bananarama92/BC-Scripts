/**
 * When the player progresses in a skill. Also validates the values to make sure they are within the proper ranges once changed. (level 0-10, progress 0-100)
 * @param {string} SkillType - Name of the skill to set the value for
 * @param {number} SkillLevel - Level to set for the given skill
 * @param {number} SkillProgress - Progress to set for the given skill
 * @param {boolean} [Push=true] - Pushes the skills to the server if TRUE
 * @returns {void} - Nothing
 */
declare function SkillChange(SkillType: string, SkillLevel: number, SkillProgress: number, Push?: boolean): void;
/**
 * Loads the skill data from the server on login
 * @param {readonly Skill[]} NewSkill - The player skills array sent by the server
 * @returns {void} - Nothing
 */
declare function SkillLoad(NewSkill: readonly Skill[]): void;
/**
 * Get a specific skill level from a character WITH the current modifier applied
 * @param {Character} C - Character for which we want to query a skill
 * @param {string} SkillType - Name of the skill to get the value of
 * @returns {number} - Current level for the given skill.
 */
declare function SkillGetLevel(C: Character, SkillType: string): number;
/**
 * Get a specific skill level from a character WITHOUT the modifier applied
 * @param {Character} C - Character for which we want to query a skill
 * @param {string} SkillType - Name of the skill to get the value of
 * @returns {number} - Current real level for the given skill.
 */
declare function SkillGetLevelReal(C: Character, SkillType: string): number;
/**
 * Get a specific skill progress from a character
 * @param {Character} C - Character for which we want to query a skill
 * @param {string} SkillType - Name of the skill to get the progress of
 * @returns {number} - Current progress for the given skill.
 */
declare function SkillGetProgress(C: Character, SkillType: string): number;
/**
 * Add progress to a skill, the skill progresses slower for each level, takes into account cheaters version.
 * @param {string} SkillType - Name of the skill to add progress to
 * @param {number} SkillProgress - Progress to be made before the ratios are applied
 * @returns {void} - Nothing
 */
declare function SkillProgress(SkillType: string, SkillProgress: number): void;
/**
 * Sets the ratio % of a skill that's going to be used by the player
 * @param {string} SkillType - Name of the skill to get the value of
 * @param {number} Ratio - The ratio to set for a given skill (0 to 1)
 * @param {boolean} [Push=true] - Pushes the skills to the server if TRUE
 */
declare function SkillSetRatio(SkillType: string, Ratio: number, Push?: boolean): void;
/**
 * Gets the ratio % of effectiveness of a skill for the player
 * @param {string} SkillType - Name of the skill to get the value of
 * @returns {number} - The current active ratio for the given skill
 */
declare function SkillGetRatio(SkillType: string): number;
/**
 * Gets a skill level with the current ratio applied to it, if the current skill has a % modifier.
 * @param {string} SkillType - Name of the skill to get the value of
 * @returns {number} - The skill level with the ratio % applied
 */
declare function SkillGetWithRatio(SkillType: string): number;
/**
 * Alters the current skill modifier for the player (Stays within -10 to 10)
 * @returns {void} - Nothing
 */
declare function SkillModifierChange(Change: any): void;
declare var SkillModifier: number;
declare var SkillModifierMax: number;
declare var SkillModifierMin: number;
declare var SkillLevelMaximum: number;
declare var SkillLevelMinimum: number;
declare var SkillBondageRatio: number;
declare var SkillValidSkills: string[];
