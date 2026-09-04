"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import { DropdownItem, DropdownMenu } from "./ui/dropdown-menu";
import { Pagination } from "./ui/pagination";
import { Skeleton } from "./ui/states";

// Coloanele doar-cu-iconiță (bifa "lucrat", butonul de apel) primesc padding
// redus și lățime fixă — altfel padding-ul standard le face mai late decât e
// nevoie și împing coloanele utile (ex. "Sponsorizat") în afara ecranului.
const ICON_COLUMNS = new Set(["lucrat", "sunat"]);

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  pageSize = 10,
  loading,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  onRowClick?: (row: T) => void;
  pageSize?: number;
  loading?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility: hidden },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setHidden as never,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <DropdownMenu
          align="end"
          trigger={
            <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--ci-border)] px-2.5 text-[12px] font-medium text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)]">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Coloane
            </button>
          }
        >
          {(close) => (
            <>
              {table.getAllLeafColumns().map((col) => (
                <DropdownItem
                  key={col.id}
                  onClick={() => {
                    col.toggleVisibility();
                  }}
                >
                  <input type="checkbox" checked={col.getIsVisible()} readOnly className="pointer-events-none" />
                  {typeof col.columnDef.header === "string" ? col.columnDef.header : col.id}
                </DropdownItem>
              ))}
              <div className="border-t border-[var(--ci-border)] mt-1 pt-1">
                <DropdownItem onClick={close}>Închide</DropdownItem>
              </div>
            </>
          )}
        </DropdownMenu>
      </div>

      <div className="ci-scrollbar overflow-x-auto rounded-xl border border-[var(--ci-border)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className={`cursor-pointer text-left text-[12px] font-semibold whitespace-nowrap text-[var(--ci-text-muted)] select-none ${
                      ICON_COLUMNS.has(h.column.id) ? "w-10 px-2 py-2.5" : "px-3.5 py-2.5"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : h.column.getIsSorted() === "desc" ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={`border-b border-[var(--ci-border)] last:border-0 ${onRowClick ? "cursor-pointer hover:bg-[var(--ci-surface-2)]" : ""}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`whitespace-nowrap text-[var(--ci-text)] ${
                      ICON_COLUMNS.has(cell.column.id) ? "w-10 px-2 py-2.5" : "px-3.5 py-2.5"
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2">
        <Pagination page={page} pageCount={pageCount} onChange={setPage} total={rows.length} pageSize={pageSize} />
      </div>
    </div>
  );
}
