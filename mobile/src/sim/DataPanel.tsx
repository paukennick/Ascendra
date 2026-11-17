import React, { useState } from "react";
import { AccessibilityInfo, ScrollView, View } from "react-native";
import { Body, Button, Card, H3, Muted, MIN_TOUCH } from "@/components/ui";
import { colors, radius, spacing } from "@/lib/theme";
import { DATA_MARK_WORDS, DATA_SEVERITY_WORDS, editCommand, type DataCellView, type DataChartView, type DataCodeView, type DataTableView, type DataView } from "./runtime/dataView.ts";
import type { CommandInput } from "./runtime/session.ts";
import type { DataMark, DataSeverity } from "./engine/v1/types.ts";

// REQ-312 (docs/sims.md 13, 20, 20.1, 22.25): the data and code console.
// Blocks in reading order (and web keyboard order): the workspace, the
// quality flags, the charts, the tables, the code, the meters and the
// results. Charts are drawn with plain views (no chart library): points or
// bars on the chart's own axis, reference lines (center line, control or
// spec limits, a target) across it; a flagged point is drawn larger with a
// ring and a "!" so it is never color alone, and every chart can be shown as
// a table, which is also what a screen reader reads. A table that does not
// fit scrolls sideways inside its card, never the page. An editable cell is
// a button: it opens the cell's options (an authored choice, never typed
// text), and picking one sends the cell's action. Nothing the learner types
// is executed. Every control is at least 48 dp (MIN_TOUCH). "Read the
// console" speaks it all.

const SEVERITY_COLOR: Record<DataSeverity, string> = { error: colors.bad, warning: colors.warn, info: colors.accent };
const MARK_COLOR: Record<DataMark, string> = { none: "transparent", error: colors.bad, warning: colors.warn, changed: colors.good, focus: colors.accent };
const MONO = { bg: "#0B0C10", text: "#E6E8EF", dim: "#A6A9B6" };
const CHART_H = 160;
const CELL_W = 120;

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: color, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, alignSelf: "flex-start" }}>
      <Muted style={{ fontSize: 12, color, fontWeight: "700" }}>{text}</Muted>
    </View>
  );
}

function Chart({ c }: { c: DataChartView }) {
  const [asTable, setAsTable] = useState(false);
  const n = c.points.length;
  const every = n > 12 ? Math.ceil(n / 12) : 1;
  return (
    <View style={{ gap: spacing.xs }}>
      <Body style={{ fontWeight: "700" }}>{c.label}</Body>
      {asTable ? (
        <View>
          {c.points.map((p) => (
            <View key={p.id} accessible accessibilityLabel={p.a11y} style={{ minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Body style={{ flex: 1 }}>{p.label}</Body>
              <Body style={{ fontFamily: "monospace", color: p.flagged ? colors.bad : colors.text }}>{`${p.flagged ? "! " : ""}${p.text}`}</Body>
            </View>
          ))}
          {c.lines.map((l) => (
            <View key={l.id} accessible accessibilityLabel={`${l.label}: ${l.text}`} style={{ minHeight: MIN_TOUCH, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Muted style={{ flex: 1 }}>{l.label}</Muted>
              <Muted style={{ fontFamily: "monospace" }}>{l.text}</Muted>
            </View>
          ))}
        </View>
      ) : (
        <View accessible accessibilityRole="image" accessibilityLabel={c.summary}>
          <View style={{ height: CHART_H, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: colors.borderLight, position: "relative", marginRight: 56 }}>
            {c.lines.map((l) => (
              <View key={l.id} style={{ position: "absolute", left: 0, right: -56, bottom: l.pos * (CHART_H - 2), height: 0, borderTopWidth: 1, borderStyle: "dashed", borderColor: colors.mutedDim }}>
                <Muted style={{ position: "absolute", right: 0, top: -14, fontSize: 10 }}>{`${l.label} ${l.text}`}</Muted>
              </View>
            ))}
            {c.kind === "bar" ? (
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, flexDirection: "row", alignItems: "flex-end", gap: 4, paddingHorizontal: 4 }}>
                {c.points.map((p) => (
                  <View key={p.id} style={{ flex: 1, height: Math.max(2, p.pos * (CHART_H - 2)), backgroundColor: p.flagged ? colors.bad : colors.accent, borderRadius: 2, alignItems: "center" }}>
                    {p.flagged ? <Muted style={{ position: "absolute", top: -16, fontSize: 12, color: colors.bad, fontWeight: "700" }}>!</Muted> : null}
                  </View>
                ))}
              </View>
            ) : (
              c.points.map((p, i) => {
                const size = p.flagged ? 12 : 8;
                return (
                  <View
                    key={p.id}
                    style={{
                      position: "absolute",
                      left: `${((i + 0.5) / n) * 100}%`,
                      bottom: p.pos * (CHART_H - 2) - size / 2,
                      marginLeft: -size / 2,
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      backgroundColor: p.value === null ? "transparent" : p.flagged ? colors.bad : colors.accent,
                      borderWidth: p.flagged ? 2 : 0,
                      borderColor: colors.text,
                    }}
                  >
                    {p.flagged ? <Muted style={{ position: "absolute", top: -16, left: 0, fontSize: 12, color: colors.bad, fontWeight: "700" }}>!</Muted> : null}
                  </View>
                );
              })
            )}
          </View>
          <View style={{ flexDirection: "row", marginRight: 56 }}>
            {c.points.map((p, i) => (
              <Muted key={p.id} numberOfLines={1} style={{ flex: 1, fontSize: 10, textAlign: "center" }}>
                {i % every === 0 ? p.label : ""}
              </Muted>
            ))}
          </View>
          <Muted style={{ fontSize: 12 }}>{`${c.unit ? `${c.unit} · ` : ""}axis ${c.min} to ${c.max}${c.flaggedCount ? ` · ${c.flaggedCount} flagged (!)` : ""}`}</Muted>
        </View>
      )}
      {c.note ? <Muted>{c.note}</Muted> : null}
      <Button
        label={asTable ? "Show as chart" : "Show as table"}
        variant="ghost"
        size="sm"
        fullWidth={false}
        onPress={() => setAsTable(!asTable)}
        accessibilityLabel={asTable ? `Show ${c.spokenLabel} as a chart` : `Show ${c.spokenLabel} as a table of values`}
      />
    </View>
  );
}

function Table({ t, editing, onEdit }: { t: DataTableView; editing: string | null; onEdit: (key: string | null) => void }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Body style={{ fontWeight: "700" }}>{t.flaggedCount ? `${t.label} (${t.flaggedCount} flagged)` : t.label}</Body>
      <ScrollView horizontal accessibilityLabel={`${t.spokenLabel}, ${t.rows.length} rows; scroll sideways for more columns`}>
        <View>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.borderLight }} accessible accessibilityLabel={`Columns: ${t.columns.map((c) => c.label).join(", ")}`}>
            <View style={{ width: 20 }} />
            {t.columns.map((c) => (
              <Muted key={c.id} style={{ width: CELL_W, paddingVertical: spacing.xs, fontWeight: "700", textAlign: c.numeric ? "right" : "left", paddingHorizontal: 4 }}>
                {c.label}
              </Muted>
            ))}
          </View>
          {t.rows.length ? null : <Muted style={{ padding: spacing.sm }}>No rows.</Muted>}
          {t.rows.map((r) => {
            const hasEdit = r.cells.some((c) => c.editable);
            return (
              <View
                key={r.id}
                accessible={!hasEdit}
                accessibilityLabel={hasEdit ? undefined : r.a11y}
                style={{ flexDirection: "row", alignItems: "center", minHeight: MIN_TOUCH, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: r.flagged ? colors.badDim : "transparent" }}
              >
                <Muted style={{ width: 20, textAlign: "center", color: colors.bad, fontWeight: "700" }}>{r.flagged ? "!" : ""}</Muted>
                {r.cells.map((c, i) => {
                  const col = t.columns[i];
                  const key = `${t.id}/${r.id}/${col.id}`;
                  if (c.editable) {
                    return (
                      <View key={col.id} style={{ width: CELL_W, paddingHorizontal: 2 }}>
                        <Button
                          label={`${c.text || "(empty)"} ✎`}
                          variant="ghost"
                          size="sm"
                          fullWidth
                          selected={editing === key}
                          disabled={!c.editable.available}
                          onPress={() => onEdit(editing === key ? null : key)}
                          accessibilityLabel={`${r.flagged ? "Flagged row. " : ""}${c.a11y}. ${c.editable.available ? "Change it" : c.editable.why ?? "Not editable now"}`}
                        />
                      </View>
                    );
                  }
                  return (
                    <View key={col.id} style={{ width: CELL_W, paddingHorizontal: 4 }} accessible={hasEdit} accessibilityLabel={hasEdit ? c.a11y : undefined}>
                      <Body style={{ fontFamily: col.numeric ? "monospace" : undefined, textAlign: col.numeric ? "right" : "left" }}>{c.text}</Body>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
      {t.note ? <Muted>{t.note}</Muted> : null}
    </View>
  );
}

function EditOptions({ cell, column, row, onPick, onCancel, disabled }: { cell: DataCellView; column: string; row: string; onPick: (v: string) => void; onCancel: () => void; disabled: boolean }) {
  const e = cell.editable!;
  return (
    <View style={{ gap: spacing.xs, borderWidth: 1, borderColor: colors.accent, borderRadius: radius.sm, padding: spacing.sm }} accessibilityLabel={`Options for ${column} in ${row}`}>
      <Body style={{ fontWeight: "700" }}>{`${e.label}: ${column}, ${row}`}</Body>
      <Muted>{`Now: ${cell.text || "empty"}. Pick a value; it runs at once.`}</Muted>
      {e.options.map((o) => (
        <Button key={o.value} label={o.label} variant="ghost" size="sm" disabled={disabled} onPress={() => onPick(o.value)} accessibilityLabel={`Set ${column} to ${o.label}`} />
      ))}
      <Button label="Cancel" variant="link" size="sm" fullWidth={false} onPress={onCancel} accessibilityLabel="Cancel the edit" />
    </View>
  );
}

function Code({ f }: { f: DataCodeView }) {
  const width = String(f.lines.length).length;
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.xs }}>
        <Body style={{ fontWeight: "700", fontFamily: "monospace" }}>{f.label}</Body>
        <Muted style={{ fontSize: 12 }}>{f.marked ? `${f.language} · ${f.marked} marked` : f.language}</Muted>
      </View>
      <ScrollView horizontal accessibilityLabel={`${f.label}, ${f.language}, ${f.lines.length} lines`}>
        <View style={{ backgroundColor: MONO.bg, borderRadius: radius.sm, paddingVertical: spacing.xs, minWidth: "100%" }}>
          {f.lines.map((l) => (
            <View
              key={l.id}
              accessible
              accessibilityLabel={l.a11y}
              style={{ flexDirection: "row", alignItems: "center", minHeight: 24, borderLeftWidth: 3, borderLeftColor: MARK_COLOR[l.mark], backgroundColor: l.mark === "none" ? "transparent" : "#1C1E27", paddingRight: spacing.sm }}
            >
              <Muted style={{ fontFamily: "monospace", fontSize: 12, color: MONO.dim, width: width * 9 + 12, textAlign: "right", paddingRight: 6 }}>{String(l.n)}</Muted>
              <Body style={{ fontFamily: "monospace", fontSize: 13, color: MONO.text }}>{l.text || " "}</Body>
              {l.mark !== "none" ? <Muted style={{ fontSize: 11, color: MARK_COLOR[l.mark], marginLeft: spacing.sm, fontWeight: "700" }}>{DATA_MARK_WORDS[l.mark]}</Muted> : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export function DataPanel({ v, onCommand, disabled, onRead }: { v: DataView | null; onCommand: (c: CommandInput) => boolean; disabled: boolean; onRead: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  if (!v) return null;
  let open: { cell: DataCellView; column: string; row: string } | null = null;
  if (editing) {
    const [tid, rid, cid] = editing.split("/");
    const t = v.tables.find((x) => x.id === tid);
    const r = t?.rows.find((x) => x.id === rid);
    const ci = t ? t.columns.findIndex((c) => c.id === cid) : -1;
    const cell = r && ci >= 0 ? r.cells[ci] : undefined;
    if (t && r && cell?.editable) open = { cell, column: t.columns[ci].label, row: r.cells[0]?.text || r.id };
  }
  const pick = (value: string) => {
    if (!open) return;
    const cmd = editCommand(open.cell, value);
    const ok = cmd ? onCommand(cmd) : false;
    if (ok) setEditing(null);
    else AccessibilityInfo.announceForAccessibility(`${open.column}: not accepted now.`);
  };
  return (
    <Card>
      <View accessible accessibilityRole="header" accessibilityLabel={`Open: ${v.workspace}`}>
        <H3>{v.workspace}</H3>
      </View>
      {v.flags.length ? (
        <View style={{ gap: spacing.xs }}>
          {v.flags.map((f) => (
            <View key={f.id} accessible accessibilityLabel={f.a11y} style={{ minHeight: MIN_TOUCH, borderLeftWidth: 3, borderLeftColor: SEVERITY_COLOR[f.severity], paddingLeft: spacing.sm, gap: 2, justifyContent: "center" }}>
              <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
                <Pill text={DATA_SEVERITY_WORDS[f.severity]} color={SEVERITY_COLOR[f.severity]} />
                <Body style={{ fontWeight: "700", flexShrink: 1 }}>{f.label}</Body>
              </View>
              <Muted>{f.text}</Muted>
            </View>
          ))}
        </View>
      ) : null}
      {v.charts.map((c) => <Chart key={c.id} c={c} />)}
      {v.tables.map((t) => (
        <View key={t.id} style={{ gap: spacing.xs }}>
          <Table t={t} editing={editing} onEdit={setEditing} />
          {open && editing?.startsWith(`${t.id}/`) ? <EditOptions cell={open.cell} column={open.column} row={open.row} onPick={pick} onCancel={() => setEditing(null)} disabled={disabled} /> : null}
        </View>
      ))}
      {v.code.map((f) => <Code key={f.id} f={f} />)}
      {v.meters.map((m) => (
        <View key={m.id} accessible accessibilityLabel={`${m.label}: ${m.text}`} style={{ minHeight: MIN_TOUCH, justifyContent: "center" }}>
          <Muted style={{ fontSize: 12 }}>{m.label}</Muted>
          <Body>{m.text}</Body>
        </View>
      ))}
      <View style={{ gap: spacing.xs }}>
        <H3>Results</H3>
        {v.results.length ? null : <Muted>No results yet. Run a step from the action list.</Muted>}
        {v.results.map((r) => (
          <View key={r.key} accessible accessibilityLabel={r.a11y} style={{ backgroundColor: MONO.bg, borderRadius: radius.sm, padding: spacing.sm, gap: spacing.xs }}>
            <Muted style={{ fontSize: 11, color: MONO.dim }}>{r.time}</Muted>
            {r.text ? <Body style={{ fontFamily: "monospace", fontSize: 13, color: MONO.text }}>{r.text}</Body> : null}
            {r.table ? (
              <ScrollView horizontal>
                <View>
                  <View style={{ flexDirection: "row" }}>
                    {r.table.columns.map((c, i) => (
                      <Muted key={i} style={{ width: CELL_W, fontFamily: "monospace", fontSize: 12, color: MONO.dim, fontWeight: "700" }}>{c}</Muted>
                    ))}
                  </View>
                  {r.table.rows.map((row, j) => (
                    <View key={j} style={{ flexDirection: "row" }}>
                      {row.map((cell, i) => (
                        <Body key={i} style={{ width: CELL_W, fontFamily: "monospace", fontSize: 12, color: MONO.text }}>{cell}</Body>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </View>
        ))}
      </View>
      <Button label="Read the console" icon="volume-2" variant="ghost" size="sm" onPress={onRead} accessibilityLabel="Read the flags, charts, tables, marked code lines and the latest result aloud" />
    </Card>
  );
}
