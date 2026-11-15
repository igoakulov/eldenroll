import { copy } from "../copy";
import type { CharacterClass } from "../engine/database";
import type { KitBlock, KitProps } from "../kit/kit";
import { KitPad } from "../kit/kit";
import { DataTable, ShareBar, type DataColumn } from "./DataTable";

/** The classes' shares of a run by their odds: real data, as the simulation page shows shares. */
function classColumns(classes: readonly CharacterClass[]): DataColumn<CharacterClass>[] {
  const total = classes.reduce((sum, row) => sum + row.odds, 0);
  const share = (row: CharacterClass) => row.odds / total;
  const scale = Math.max(...classes.map(share));
  return [
    { id: "name", label: "Name", sortValue: (row) => row.name, render: (row) => row.name },
    { id: "odds", label: "Odds", numeric: true, sortValue: (row) => row.odds, render: (row) => row.odds },
    {
      id: "share",
      label: "Share",
      numeric: true,
      sortValue: share,
      render: (row) => (
<ShareBar share={share(row)} scale={scale} text={`${(share(row) * 100).toFixed(1)}%`} />
      ),
    },
  ];
}

function LiveTable({ kit }: KitProps) {
  const classes = kit.database.character_class;
  return (
    <KitPad>
      <DataTable label="Classes" columns={classColumns(classes)} rows={classes} rowKey={(row) => row.id} initialSort="share" />
    </KitPad>
  );
}

export const kit: readonly KitBlock[] = [
  {
    id: "data-table",
    title: "Data table",
    section: "simulation",
    size: "phone",
    states: [
      {
        label: "sorted by share",
        render: ({ database }) => (
          <KitPad>
            <DataTable
              label="Classes"
              columns={classColumns(database.character_class.slice(0, 4))}
              rows={database.character_class.slice(0, 4)}
              rowKey={(row) => row.id}
              initialSort="share"
            />
          </KitPad>
        ),
      },
      {
        label: "faded: too few objectives",
        render: ({ database }) => (
          <KitPad>
            <DataTable
              label="Classes"
              columns={classColumns(database.character_class.slice(0, 2))}
              rows={database.character_class.slice(0, 2)}
              rowKey={(row) => row.id}
              faded={() => true}
            />
          </KitPad>
        ),
      },
      {
        label: "folded after 4 rows",
        render: ({ database }) => (
          <KitPad>
            <DataTable
              label="Classes"
              columns={classColumns(database.character_class)}
              rows={database.character_class}
              rowKey={(row) => row.id}
              initialSort="share"
              fold={{ after: 4, showAll: copy.sim.showAll, showLess: copy.sim.showLess }}
            />
          </KitPad>
        ),
      },
      {
        label: "empty",
        render: () => (
          <KitPad>
            <DataTable label="Empty" columns={[]} rows={[]} rowKey={String} empty="Nothing." />
          </KitPad>
        ),
      },
    ],
    Live: LiveTable,
    note: "Tap a column heading to sort by it; tap again to turn the order around. On desktop, hover brightens a heading. A folded table keeps its first rows in the current sort; Show all opens the rest.",
  },
];
