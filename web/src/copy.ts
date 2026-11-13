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

  // The simulation page at /simulate/ (web/sim/README.md#The page): its own page, not part of a run
  simulate: {
    title: "Simulation",
    lede: "Plays whole runs the way a player would and counts what they were shown.",
    toApp: "Open EldenRoll",
    settings: "Settings",
    runs: "Runs",
    runsDetail: "Up to 10",
    allocation: "Stat allocation focus",
    allocations: {
      ITEMS: "Towards rolled gear",
      STR: "Strength",
      DEX: "Dexterity",
      INT: "Intelligence",
      FTH: "Faith",
      ARC: "Arcane",
      ALL: "Everything evenly",
    },
    rerollEvery: "Reroll every",
    rerollEveryDetail: "Number of objectives",
    seed: "Seed",
    newSeed: "New seed",
    regions: "Regions",
    completion: "Region completion",
    completionDetail: (value: number) => `${value}% of a region's bosses felled before the next region opens`,
    percent: (value: number) => `${value}%`,
    regionsDetail: "Numbered in the order a run opens them: the first DLC regions come after Farum Azula, before the Haligtree.",
    allRegions: "All",
    regionNumbered: (number: number, name: string) => `${number}. ${name}`,
    simulate: "Simulate",
    simulating: (done: number, total: number) => `Simulating ${done} of ${total}`,
    stale: "These results are from earlier settings.",
    noRegions: "Tick a region to simulate.",
    failed: (message: string) => `The simulation stopped: ${message}`,
    loading: "Loading",
    classes: "Classes",
    allClasses: "All",
    searchLabel: "Search the tables",
    searchPlaceholder: "Find an item, combat rule or armor set",
    tabs: ["Overview", "Gear", "Boosts", "Decay"],
    noClasses: "Pick a class to see its results.",
    counted: (total: number) => `Out of ${total} objectives.`,
    nothing: "Nothing.",
    columns: {
      name: "Name",
      share: "Share",
      objectives: "Objectives",
      rolls: "Rolls",
      what: "What",
      gap: "Gap",
      soon: "Within 10",
      showings: "Showings",
      klass: "Class",
      slot: "Slot",
      region: "Region",
      demand: "Stats needed, in total",
      boost: "Boost",
      decay: "Decay when rolled",
      value: "Mean",
      shownPerRun: "Shown per run",
      endDecay: "Decay at the end",
      halvedAt: "Odds below half at",
    },
    overview: {
      runs: "Runs",
      perRun: "Each run, on average",
      objectives: "Objectives",
      rerolls: "Rerolls",
      level: "Final level",
      runsCount: (runs: number) => (runs === 1 ? "1 run" : `${runs} runs`),
      classes: "Classes",
      classesLede: "The picked classes' shares of every objective.",
      ruleNone: "Combat rule slots showing None",
      neither: "Neither slot",
      one: "One slot",
      ruleNoneNote: "Both never can: the second combat rule slot leaves out what the first rolled.",
      neverRolled: "Never rolled",
      inReach: "In a pool at some point, never shown",
      outOfReach: "Never in a pool under these settings",
      empties: "Empty results",
      emptiesLede: "Rolls that found nothing at all, not even none. A slot whose only roll is none is left out.",
      noEmpties: "Every slot found something to roll.",
    },
    gear: {
      rh: "Right hand",
      lh: "Left hand",
      handLede: "By weapon class. The bright tick is the share pool size alone would give, if every class held as many weapons.",
      pairs: "Both hands",
      pairsLede: "Right hand and left hand classes together, as the player holds them.",
      rhColumn: "Right hand",
      lhColumn: "Left hand",
      sameClass: (share: string, of: number) =>
        `Same weapon class in both hands: ${share} of the ${of} objectives with a weapon in each.`,
      dualWieldAim: "The aim for Dual-Wield Warrior is 75%.",
      spell: "Spell",
      weaponAsh: "Ashes of war for weapons",
      shieldAsh: "Ashes of war for shields",
      item: "Item",
      talisman: "Talismans",
      talismanLede: "Either slot.",
      rule: "Combat rules",
      ruleLede: "Either slot.",
      armor: "Armor sets",
    },
    boosts: {
      lateness: "Lateness and stat boost",
      latenessLede:
        "Every roll that showed an item, by the region that makes it late and by the stats it needs. Boost: the mean lateness and stat multiplier on the items that won, without decay. Decay when rolled: the mean decay those items already carried when they won.",
      noLocation: "No location",
      /** Strength counts at its two-handed requirement, as the boost counts it. */
      statTotal: (from: number, to: number | null) =>
        from === 0 ? "None" : to === null ? `${from} or more` : `${from} to ${to}`,
      times: (value: string) => `×${value}`,
      guarantees: "Guarantees",
      guaranteesLede: "Each must win 99% of the rolls where it is in play.",
      won: (share: string, active: number) => `${share} of ${active}`,
      failed: (share: string, active: number) => `${share} of ${active}, under 99%`,
      lostTo: (names: string) => `Lost to ${names}`,
      lostToEmpty: "an empty roll",
      others: "Other boosts",
      othersLede: "How often an option they boosted won, with no aim to meet.",
      synergies: "Planned synergies",
      synergiesLede: "Each step: how often its target rolled once its trigger was in place.",
      landed: (share: string, triggered: number) => `${share} of ${triggered}`,
      outOfPlace: "Synergy talismans out of place",
      outOfPlaceLede: "Of the objectives showing the talisman, the share where its synergy didn't hold.",
      outOfPlaceDetail: {
        lord_of_bloods_exultation: "No bleed weapon or ash brought it in",
        kindred_of_rots_exultation: "No rot or poison weapon or ash brought it in",
        blue_dancer_charm: "Armor neither a light set nor the Naked Set it boosted",
        claw_talisman: "Without Jump attacks only",
        axe_talisman: "Without a charged-attack combat rule",
      },
      /** A modifier: its conditions, its targets and the multiplier, in game names. */
      list: (names: readonly string[] | null) =>
        names === null
          ? "anything"
          : names.length <= 3
            ? names.join(", ").replace(/, ([^,]*)$/, " and $1")
            : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`,
      slots: {
        rh: "the right hand",
        lh: "the left hand",
        rh_ash: "an ash slot",
        lh_ash: "an ash slot",
        spell: "the spell slot",
        item: "the item slot",
        talisman_1: "a talisman slot",
        talisman_2: "a talisman slot",
        rule_1: "a combat rule slot",
        rule_2: "a combat rule slot",
        armor: "the armor slot",
      },
      rolled: (names: string, slots: string) => `${names} in ${slots}`,
      notRolled: (names: string, slots: string) => `no ${names} in ${slots}`,
      boss: (names: string) => `the boss is ${names}`,
      notBoss: (names: string) => `the boss isn't ${names}`,
      or: " or ",
      and: "; ",
      modifier: (when: string, target: string, times: string) => `${when} → ${target} ×${times}`,
      always: "Always",
    },
    decay: {
      repeats: "Repeats",
      repeatsLede:
        "Gap: objectives since the same thing last showed in that run. Within 10: the share of showings that repeat one from the last 10 objectives.",
      repeatKinds: {
        class: "Class",
        rh: "Right hand",
        lh: "Left hand",
        ash: "Ash of war",
        spell: "Spell",
        item: "Item",
        talisman: "Talisman",
        rule: "Combat rule other than None",
        armor: "Armor set",
      },
      overTheRun: "Over the run",
      items: "Items",
      itemsLede:
        "Every option in reach for the picked classes, and how far decay took it: how often it showed per run, the multiplier on its odds once the run ends, and the objective whose roll first had its odds below half. Earliest first. Decay counts showings across every class, as the engine does.",
      chartLede: (shown: number, more: number) =>
        `Each item's chance per stretch of 20 objectives: its share of its slot's roll, its odds against every option competing with it at that moment. The gold line is the chance with decay, the dashed one with every decay removed. Decay works on both sides: until an item shows, the others' decay frees room for it, so its chance can sit above the dashed line; once it shows, its own decay pulls it down. Both lines fall as new regions and higher stats bring more competitors. A dot is an objective it showed on, in any run, for the picked classes; showings and decay count every class, as the engine does.${
          more === 0 ? "" : ` Charts for the first ${shown} matches, ${more} more in the table; narrow the search to chart them.`
        }`,
      searchToChart: "Search for an item to chart its chance over the run.",
      never: "Never",
      halvedAt: (objective: number, runs: number, of: number) =>
        runs === of ? `${Math.round(objective)}` : `${Math.round(objective)} in ${runs} of ${of} runs`,
      times: (value: string) => `×${value}`,
      metrics: (odds: string, late: string | null, rate: string) =>
        `Base odds ${odds}${late === null ? "" : `, lateness boost ×${late}`}, decay ×${rate} per showing`,
      point: (from: number, to: number) => `Objectives ${from} to ${to}`,
      chance: "Chance",
      withoutDecay: "Without decay",
      shownSoFar: (to: number) => `Shown by ${to}, any class`,
      decaySoFar: (to: number) => `Decay by ${to}`,
      oddsLeft: "Odds left",
    },
    slotNames: {
      rh: "Right hand",
      rh_ash: "Right-hand ash",
      lh: "Left hand",
      lh_ash: "Left-hand ash",
      spell: "Spell",
      item: "Item",
      talisman_1: "Talisman 1",
      talisman_2: "Talisman 2",
      rule_1: "Combat rule 1",
      rule_2: "Combat rule 2",
      armor: "Armor",
    },
  },
} as const;
