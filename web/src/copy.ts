// Every word the app shows, by screen, in the order a player meets them. Game data (bosses, items, classes, rules,
// regions) comes from the database instead. Text with a number or a name in it is a small function: change the
// words between the quotes and leave the `${…}` parts as they are. `src/copyInComponents.test.ts` fails on any
// word written straight into a screen.

export const copy = {
  // Words several screens share, so a feature reads the same wherever it appears
  common: {
    appName: "EldenRoll",
    objective: (number: number) => `Objective ${number}`,
    /** A run as a row names it: the objective and its boss, or the objective alone between objectives. */
    runTitle: (number: number, boss?: string) =>
      boss === undefined ? `Objective ${number}` : `Objective ${number}, ${boss}`,
    newRun: "New run",
    runSettings: "Run settings",
    runSettingsDetail: "Classes, never roll, shortlist, bosses",
    howItWorks: "How it works",
    finishRun: "Finish run",
    levelUp: "Level up",
    level: "Level",
    regions: "Regions",
    bosses: "Bosses",
    reroll: "Reroll",
    done: "Done",
    save: "Save",
    menu: "Menu",
    close: "Close",
    closeWithoutSaving: "Close without saving",
    changesApplyOnNextRoll: "Changes apply on the next roll.",
    unknownBoss: "unknown boss",
    unknownClass: "unknown class",
  },

  // Start: the wordmark, the tagline, and a run in progress
  start: {
    loading: "Loading",
    loadFailed: "The game data could not be loaded. Check your connection, then try again.",
    tryAgain: "Try again",
    /** Typed in turn under the wordmark. Each holds `taglineLink` once and fits two lines on a phone; the first is
     * the main one, on one line. */
    taglines: [
      "Follow fate to become Elden Rold.",
      "Roll objectives, gather your gear, and fell your foes to become Elden Rold.",
    ] as readonly string[],
    /** The words in each tagline that open the Elden Rold card. */
    taglineLink: "Elden Rold",
    startRun: "Start run",
    resume: "Resume",
    runInProgress: "Run in progress",
    currentRun: "Current run",
    inProgress: "In progress",
  },

  // The stats and regions on Start and Level up
  statsAndRegions: {
    stats: {
      vig: "Vigor",
      mind: "Mind",
      end: "Endurance",
      str: "Strength",
      dex: "Dexterity",
      int: "Intelligence",
      fth: "Faith",
      arc: "Arcane",
    },
    /** Beside a region from the expansion. */
    dlc: "DLC",
  },

  // Why a run can't start or roll, in the bottom bar of Start, Run settings and Level up
  notices: {
    noClass: "Select at least one class.",
    lowLevel: "Raise your stats to level 1 or above.",
    noRegion: "Select at least one region.",
    noBosses: "No bosses available for the selected regions.",
    regionsCleared: "No bosses left in your selected regions.",
    allDead: "Every boss is already felled.",
  },

  // The Elden Rold card, opened from the tagline or `How it works`. Words in [brackets] are the app's own buttons,
  // set apart in the text
  rold: {
    title: "Welcome to EldenRoll, Tarnished",
    lede: "A companion to keep open while you play. Each objective rolls a boss to fell and the class and gear to fell it with, so every playthrough feels new again.",
    pun: "Follow fate to become Elden Rold.",
    aRun: "A run",
    steps: [
      "Set your stats and the regions you can reach, then start a run.",
      "Fell the rolled boss with only the rolled class, gear and combat rules.",
      "Not for you? [Reroll] the whole objective, or only from one slot on, as often as you like.",
      "Tap [Done], level up, and roll the next objective.",
      "Felled that boss already? Tap [Felled?] on its health bar for a new one.",
    ],
    onYourPhone: "On your phone",
    homeScreen:
      "Add EldenRoll to your Home Screen before your first run, and it opens full screen, like an app. On iPhone a run started in Safari stays in Safari.",
    howTo: [
      { device: "iPhone", how: "In Safari, tap Share, then Add to Home Screen." },
      { device: "Android", how: "In Chrome, tap ⋮, then Add to Home screen." },
    ],
    disclaimer:
      "Unofficial fan tool. Not affiliated with or endorsed by FromSoftware or Bandai Namco. ELDEN RING is a trademark of its owners.",
  },

  // Run settings, from Start or the menu
  runSettings: {
    tabs: { general: "General", neverRoll: "Never roll", shortlist: "Shortlist" },
    classes: "Classes",
    gear: "Gear",
    maxStatGap: "Max stat gap",
    maxStatGapDetail: "Points an item may need above your stats",
    bossCounts: (felled: number, skipped: number) => `${felled} felled, ${skipped} skipped`,
    bossGearLocked: "Boss gear locked until felled",
    bossGearLockedDetail: "Must fell boss first to roll their gear",
    neverRollNote: "Anything selected here never rolls again.",
    searchNeverRoll: "Search Never roll",
    neverRollNotFound: "Nothing by that name.",
    shortlistNote: "Add your favorite or upgraded weapons. Classes will first roll their Right Hand from your shortlist.",
    shortlistEnabled: "Roll Right Hand from shortlist",
    searchShortlist: "Search weapons",
    shortlistNotFound: "No weapon by that name.",
    /** After the count of picked entries. */
    selected: "selected",
    clearAll: "Clear all",
    /** Search results in Never roll and the shortlist, grouped in card order. */
    gearGroups: {
      weapon: "Weapons",
      shield: "Shields",
      ash: "Ashes of War",
      sorcery: "Sorceries",
      incantation: "Incantations",
      talisman: "Talismans",
      armor_set: "Armor",
      tool: "Tools",
      consumable: "Consumables",
      rule: "Combat rules",
    },
  },

  // Bosses, from Run settings
  bosses: {
    /** The legend's three states, also what each boss's control steps through. */
    states: {
      alive: { label: "Alive", lines: ["Can be rolled as an objective.", "Its gear cannot be rolled yet."] },
      dead: { label: "Felled", lines: ["Felled in an objective or on the way.", "Its gear can be rolled."] },
      skipped: { label: "Skipped", lines: ["Never rolled as an objective.", "Its gear cannot be rolled."] },
    },
    /** In place of the control on the current objective's boss. */
    current: "Current",
    search: "Search bosses",
    notFound: "No boss by that name.",
    /** Section headings while searching. */
    searchTitles: {
      alive: "Alive",
      skipped: "Skipped",
      dead: "Felled on the way",
      objectives: "Felled in objectives",
    },
    /** Section headings, after the count. */
    countedSkipped: "skipped",
    countedOnTheWay: "felled on the way",
    countedInObjectives: "felled in objectives",
    showAll: (count: number) => `Show all ${count}`,
    showLess: "Show less",
  },

  // The card: the current objective
  card: {
    /** On the boss's bar, before its question mark. */
    felled: "Felled",
    weapons: "Weapons",
    leftHand: "Left hand",
    rightHand: "Right hand",
    spell: "Spell",
    talismans: "Talismans",
    armor: "Armor",
    item: "Item",
    combatRules: "Combat rules",
  },

  // The reroll panel, and the same panel after `Felled?`
  reroll: {
    /** The chips, left to right as the slider runs. */
    chips: {
      armor: "Armor",
      rules: "Rules",
      talismans: "Talismans",
      item: "Item",
      spell: "Spell",
      leftHand: "Left hand",
      rightHand: "Right hand",
      characterClass: "Class",
      boss: "Boss",
    },
    chipsLabel: "Lit slots will change",
    slider: "Reroll scope",
    armorOnly: "Armor only",
    fullObjective: "Full objective",
    /** Read out by a screen reader as the slider moves. */
    rerollsFrom: (chip: string) => `Rerolls from ${chip}`,
    rerollsFullObjective: "Rerolls the full objective",
    felledEyebrow: "Felled on the way?",
    felledChipsLabel: "After the reroll",
    felledOnTheWay: "Boss felled on the way",
    gearUnlocked: "Boss gear unlocked",
    newObjective: "New objective",
    confirm: "Accept and reroll",
  },

  // Great enemy felled, after `Done` or `Felled?`
  felled: {
    /** Two lines. */
    title: ["Great enemy", "felled"],
    nextObjectiveIn: "Next objective in",
    rerollingIn: "Rerolling in",
  },

  // Level up, between objectives or from `Level N`
  levelUp: {
    complete: (number: number) => `Objective ${number} complete`,
    ledeNext: "Update your stats and regions before you roll next objective.",
    regionsSelected: (selected: number, total: number) => `${selected} of ${total} selected`,
    nextInOrder: "Next in order",
    showAllRegions: (count: number) => `Show all ${count} regions`,
    showFewerRegions: "Show fewer regions",
    rollObjective: (number: number) => `Roll objective ${number}`,
  },

  // The menu, over the card or Level up
  menu: {
    close: "Close menu",
    howItWorksDetail: "What a run asks of you, and keeping it on your phone",
    finishRunDetail: "Ends this run and shows its summary",
  },

  // The confirmations, for `Finish run` and `New run`
  confirm: {
    chipsLabel: "What happens",
    abandonObjective: (number: number) => `Abandon objective ${number}`,
    saveToPastRuns: "Save to Past runs",
    finishQuestion: "End this run and see its summary?",
    finishCannotResume: "Cannot resume",
    newRunQuestion: "Finish the current run and start a new one?",
    newRunCannotResume: "Cannot resume current run",
    newRunAction: "Start new run",
  },

  // Shared controls, mostly read out by screen readers
  controls: {
    cancel: "Cancel",
    undo: "Undo",
    /** An empty slot, and one whose pick is the player's. */
    none: "none",
    any: "any",
    toStart: "EldenRoll, to Start",
    onTheWiki: (name: string) => `${name} on the wiki`,
    levelButton: (level: number) => `Level up, level ${level}`,
    /** Between the old level and the new one. */
    levelTo: "to",
    lower: (stat: string) => `Lower ${stat}`,
    raise: (stat: string) => `Raise ${stat}`,
    previousState: "Previous state",
    nextState: "Next state",
    searchPlaceholder: "Search by name",
    clearSearch: "Clear search",
  },
} as const;
