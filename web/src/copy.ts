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
    runs: "All runs",
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
    /** The words in each tagline that open How it works. */
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

  // How it works, opened from the tagline's `Elden Rold` or the menu. Words in [brackets] are the app's own buttons,
  // set apart in the text
  howItWorks: {
    title: "Welcome to EldenRoll, Tarnished",
    lede: "A companion to keep open while you play. Each objective rolls a boss to fell and the class and gear to fell it with, so every playthrough feels new again.",
    pun: "Follow fate to become Elden Rold.",
    aRun: "A run",
    steps: [
      "Set your stats and the regions you can reach, then start a run.",
      "Fell the rolled boss with only the rolled class, gear and combat rule.",
      "Not for you? [Reroll] the whole objective, or only from one slot on, as often as you like.",
      "Tap [Done], level up, and roll the next objective.",
      "Felled that boss already? Tap [Felled?] on its health bar for a new one.",
    ],
    onYourPhone: "On your phone",
    homeScreen:
      "Add EldenRoll to your Home Screen before your first run: it opens full screen, like an app, and works offline. On iPhone a run started in Safari stays in Safari.",
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
    combatRule: "Combat rule",
  },

  // The reroll panel, and the same panel after `Felled?`
  reroll: {
    /** The chips, left to right as the slider runs. */
    chips: {
      armor: "Armor",
      rule: "Rule",
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
    /** For screen readers: the tap area over the words and the countdown. */
    skipSecond: "Skip a second",
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
    howItWorksDetail: "How to play, getting started",
    summary: "Run summary",
    summaryDetail: "Stats and timeline",
    /** The `All runs` row's line, on Start and here. */
    finishedRuns: (count: number) =>
      count === 0 ? "No finished runs yet" : count === 1 ? "1 finished run" : `${count} finished runs`,
    thisRun: "This run",
    thisRunAnd: (finished: number) => `This run and ${finished} finished`,
    finishRunDetail: "Ends run and shows summary",
  },

  // A run's view, for the run in progress and a finished one, and the lists it opens
  runView: {
    current: "Current run",
    finished: "Finished run",
    inProgress: "In progress",
    finishedOn: (date: string) => `Finished ${date}`,
    /** A finished run's size, in its row in All runs. */
    objectives: (count: number) => (count === 1 ? "1 objective" : `${count} objectives`),
    tabsLabel: "Run",
    tabs: { summary: "Summary", timeline: "Timeline" },
    totals: "Totals",
    objectivesCompleted: "Objectives completed",
    bossesFelled: "Bosses felled",
    bossesSkipped: "Bosses skipped",
    rerolls: "Rerolls",
    /** Section headings, after their count. */
    topClasses: "top classes",
    uniqueGear: "unique gear",
    mostRerolled: "most rerolled",
    showAll: (count: number) => `Show all ${count}`,
    showLess: "Show less",
    /** Unique gear's rows, and its list's heading after the count. */
    gearKinds: {
      weapons: { row: "Weapons", counted: "weapons" },
      shields: { row: "Shields", counted: "shields" },
      sorceries: { row: "Sorceries", counted: "sorceries" },
      incantations: { row: "Incantations", counted: "incantations" },
      armor_sets: { row: "Armor sets", counted: "armor sets" },
      shortlist: { row: "Shortlist", counted: "in the shortlist" },
    },
    /** Under a most rerolled name: what it is. */
    rerolledKinds: {
      boss: "Boss",
      character_class: "Class",
      weapon: "Weapon",
      shield: "Shield",
      sorcery: "Sorcery",
      incantation: "Incantation",
      talisman: "Talisman",
      item: "Item",
      armor_set: "Armor set",
      rule: "Combat rule",
    },
    gearTitle: "Unique gear",
    gearLede: "Tap to find it in objectives.",
    skipped: "skipped",
    felledOnTheWay: "Felled on the way",
    atDone: "At Done",
    /** The stats at Done, where an open objective has only a narrow column for all eight. */
    statsShort: { vig: "VIG", mind: "MND", end: "END", str: "STR", dex: "DEX", int: "INT", fth: "FTH", arc: "ARC" },
    levelAt: (level: number) => `Level ${level}`,
    search: "Search this run",
    notFound: "Nothing by that name in this run.",
    found: (found: number, total: number) => `${found} of ${total} objectives`,
    /** Search results' groups, in card order. */
    searchGroups: {
      boss: "Bosses",
      character_class: "Classes",
      weapon: "Weapons",
      shield: "Shields",
      ash: "Ashes of War",
      sorcery: "Sorceries",
      incantation: "Incantations",
      talisman: "Talismans",
      armor_set: "Armor",
      item: "Items",
      rule: "Combat rules",
    },
  },

  // All runs, from Start and the menu
  allRuns: {
    /** After the count of finished runs. */
    finished: (count: number) => (count === 1 ? "finished run" : "finished runs"),
    /** A finished run's row: its size first, then its last boss to tell apart runs of a similar size. */
    finishedTitle: (objectives: string, boss: string) => `${objectives}, ${boss}`,
    deleteRun: "Delete run",
    deleteRunDetail: "Removes it from All runs",
    deleteQuestion: "Delete this run from All runs?",
    cannotUndo: "Cannot undo",
  },

  // The confirmations, for `Finish run` and `New run`; `Delete run`'s words are with All runs
  confirm: {
    chipsLabel: "What happens",
    abandonObjective: (number: number) => `Abandon objective ${number}`,
    saveToAllRuns: "Save to All runs",
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

  // The simulation page at /sim/ (web/sim/README.md#The page): its own page, not part of a run
  sim: {
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
    seed: "Seed",
    newSeed: "New seed",
    regions: "Regions",
    completion: "Region completion",
    completionDetail: (value: number) =>
      `${value}% of a region's bosses felled before the next region opens; all of them in Leyndell, Farum Azula, the Ashen Capital and Enir-Ilim, which the game leads through end to end`,
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
    tabs: ["Overview", "Slots", "Synergies", "Items"],
    noClasses: "Pick a class to see its results.",
    showAll: (count: number) => `Show all ${count}`,
    showLess: "Show less",
    counted: (perRun: string) => `Out of ${perRun} objectives per run.`,
    countedShowings: (perRun: string) => `Out of ${perRun} showings per run.`,
    nothing: "Nothing.",
    columns: {
      name: "Name",
      share: "Share",
      what: "What",
      gap: "Gap",
      apart: "Apart",
      soon: "Within 10",
      pastLimit: "Too often",
      klass: "Class",
      slot: "Slot",
      region: "Region",
      boost: "Boost",
      value: "Mean",
      perRun: "Per run",
      seenIn: "Runs",
      fair: "Vs fair",
      fairPerRun: "Fair per run",
    },
    overview: {
      runs: "Runs",
      perRun: "Each run, on average",
      objectives: "Objectives",
      level: "Final level",
      runsCount: (runs: number) => (runs === 1 ? "1 run" : `${runs} runs`),
      classes: "Classes",
      classesLede: "The picked classes' shares of every objective.",
      repeats: "Repeats",
      repeatsLede:
        "Apart: objectives since the same thing last showed in that run. Within 10: the share of showings that repeat one from the last 10 objectives. Too often: the share of showings that make it 4 objectives in a row or 5 of the last 10. None never counts.",
      repeatKinds: {
        class: "Class",
        rh: "Right hand",
        lh: "Left hand",
        ash: "Ash of war",
        spell: "Spell",
        item: "Item",
        talisman: "Talisman",
        rule: "Combat rule",
        armor: "Armor set",
      },
    },
    slots: {
      rh: "Right hand",
      lh: "Left hand",
      handLede: {
        class: "By weapon class. Vs fair: the share against what pool size alone would give, if every class held as many weapons; 1.00 is even.",
        weapon: "By weapon.",
      },
      regionLede:
        "By the region where each first comes into reach, empty slots left out. Vs fair: the share against what it would be if every option in reach showed equally; 1.00 is even.",
      regionBothSlots: "Both slots count.",
      furthest: "Furthest from fair",
      furthestLede: (runs: number, found: number) =>
        `Gaps too large to be luck in ${runs === 1 ? "1 run" : `${runs} runs`}. ${found} found. Vs fair: 1.00 is even.`,
      classesTogether: (count: number, others: boolean) => `${count} ${others ? "other classes" : "classes"} together`,
      noLocation: "No location",
      countBy: "Count by",
      byClass: "Weapon class",
      byWeapon: "Weapon",
      byItem: "Item",
      byRegion: "Region",
      pairs: "Both hands",
      pairsLede: "Right hand and left hand classes together, as the player holds them.",
      rhColumn: "Right hand",
      lhColumn: "Left hand",
      sameClass: (share: string, of: string) =>
        `Same weapon class in both hands: ${share} of the ${of} objectives per run with a weapon in each.`,
      dualWieldAim: "The aim for Dual-Wield Warrior is about 60%, with about 30% a paired weapon and an empty left hand.",
      spell: "Spell",
      weaponAsh: "Ashes of war for weapons",
      shieldAsh: "Ashes of war for shields",
      item: "Item",
      talisman: "Talismans",
      talismanLede: "Either slot.",
      rule: "Combat rules",
      armor: "Armor sets",
      empties: "Empty results",
      emptiesLede: "Rolls that found nothing at all, not even none. A slot whose only roll is none is left out, and so is an ash slot whose hand can't hold an ash, such as a somber weapon.",
      noEmpties: "Every slot found something to roll.",
    },
    synergies: {
      wins: "Synergy wins",
      winsLede:
        "Every modifier that boosts: how often it was in play per run, and the share of those objectives where what it boosted won.",
      outside: "Shown without their synergy",
      outsideLede:
        "What a synergy boosts, showing without it, its condition not holding: the share of all its showings, and how often per run. Only the classes and slots the synergy applies to count.",
      id: "Id",
      rule: "Synergy",
      won: "Won",
      without: "Without",
      times: (value: string) => `×${value}`,
      /** A modifier: its conditions and its targets, in game names. */
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
        rule: "the combat rule slot",
        armor: "the armor slot",
      },
      rolled: (names: string, slots: string) => `${names} in ${slots}`,
      notRolled: (names: string, slots: string) => `no ${names} in ${slots}`,
      boss: (names: string) => `the boss is ${names}`,
      notBoss: (names: string) => `the boss isn't ${names}`,
      or: " or ",
      and: "; ",
      target: (names: string) => `→ ${names}`,
      always: "Always",
    },
    items: {
      overTheRun: "Over the run",
      chartLede: (shown: number, more: number) =>
        `Each item's chance per stretch of 20 objectives: its share of its slot's roll, against every option competing with it at that moment. The gold line is the chance on the rolls where it could roll, with the catch-up boost; the dashed line the same with the boost removed from every option. Items in reach from the start sit below the dashed line, since later items take a bigger share; a late item rises above it from when it comes into reach. Both fall as new regions and higher stats bring more competitors. The solid bronze line is the gold one over every roll of the slot, 0 where a rule or the class left the item out, so it shows how often the item comes up. Boosted by synergy is the share of the rolls where it could roll that a synergy boosted it, and Synergies won the share of its showings in the stretch that one won. A dot is an objective it showed on, in any run, for the picked classes.${
          more === 0 ? "" : ` Charts for the first ${shown} matches; ${more} more match, so narrow the search to chart them.`
        }`,
      searchToChart: "Search for an item to chart its chance over the run.",
      times: (value: string) => `×${value}`,
      metrics: (odds: string) => `Base odds ${odds}`,
      neverRolled: "Never rolled",
      inReach: "In a pool at some point, never shown",
      outOfReach: "Never in a pool under these settings",
      point: (from: number, to: number) => `Objectives ${from} to ${to}`,
      chance: "Chance where it can roll (gold)",
      withoutCatchUp: "Without catch-up (dashed)",
      overall: "Over every roll (bronze)",
      catchUpBoost: "Catch-up boost",
      boostedBySynergy: "Boosted by synergy",
      synergiesWon: "Synergies won",
      shownSoFar: (to: number) => `Shown by ${to}`,
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
      rule: "Combat rule",
      armor: "Armor",
    },
  },
} as const;
