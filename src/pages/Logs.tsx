import React, { useMemo, useState } from "react";
import { Download, FileText, Search, RotateCcw, Eye, MoreHorizontal, Trash2, CheckCircle2, ShieldCheck } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Button, Input, Select, SevBadge, Dropdown, Pagination, EmptyState, Skeleton } from "../lib/ui";
import { fmtTime, fmtDateTime, timeAgo, downloadBlob, incidentsToCsv, incidentsToPdf, type Incident } from "../lib/data";

const PAGE_SIZE = 8;

export default function Logs() {
  const s = useStore();
  const [q, setQ] = useState("");
  const [sev, setSev] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [minConf, setMinConf] = useState("0");
  const [range, setRange] = useState("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const types = useMemo(() => Array.from(new Set(s.incidents.map((i) => i.label))), [s.incidents]);
  const sources = useMemo(() => Array.from(new Set(s.incidents.map((i) => i.sourceId))), [s.incidents]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const nowTs = s.now;
    const ranges: Record<string, number> = { "1H": 3600_000, "24H": 86400_000, "7D": 7 * 86400_000 };
    return s.incidents.filter((i) => {
      if (sev !== "ALL" && i.severity !== sev) return false;
      if (type !== "ALL" && i.label !== type) return false;
      if (source !== "ALL" && i.sourceId !== source) return false;
      if (i.confidence < parseFloat(minConf)) return false;
      if (range !== "ALL" && nowTs - i.time > ranges[range]) return false;
      if (ql && !(`${i.id} ${i.label} ${i.sourceId} ${i.sourceName}`.toLowerCase().includes(ql))) return false;
      return true;
    });
  }, [s.incidents, q, sev, type, source, minConf, range, s.now]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pages);
  const rows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);
  const hasFilters = q || sev !== "ALL" || type !== "ALL" || source !== "ALL" || minConf !== "0" || range !== "ALL";

  const reset = () => {
    setQ(""); setSev("ALL"); setType("ALL"); setSource("ALL"); setMinConf("0"); setRange("ALL"); setPage(1);
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  const exportCsv = () => {
    downloadBlob(`safehaven_threats_${Date.now()}.csv`, incidentsToCsv(filtered));
    s.toast("success", "Export completed", `${filtered.length} events exported as CSV.`);
  };
  const exportPdf = () => {
    downloadBlob(`safehaven_threats_${Date.now()}.pdf`, incidentsToPdf(filtered));
    s.toast("success", "Export completed", `${filtered.length} events exported as PDF.`);
  };

  const sevFilter = (
    <div className="flex flex-wrap items-center gap-2">
      {(["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((v) => (
        <button
          key={v}
          onClick={() => { setSev(v); setPage(1); }}
          className={sev === v ? "h-[30px] rounded-lg border border-pri/60 bg-pri/12 px-3 font-mono text-[10.5px] font-bold text-pri" : "h-[30px] rounded-lg border border-line bg-ink px-3 font-mono text-[10.5px] font-semibold text-t2 transition-colors duration-150 hover:border-edge hover:text-t1"}
        >
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 font-mono text-[11px] text-t3">
          <span><span className="font-bold text-t1">{filtered.length}</span> events</span>
          <span>·</span>
          <span><span className="font-bold text-threat">{filtered.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH").length}</span> high-risk</span>
        </div>
        <div className="flex gap-2.5">
          <Button variant="secondary" onClick={exportCsv} disabled={!filtered.length}><Download size={14} /> EXPORT CSV</Button>
          <Button variant="secondary" onClick={exportPdf} disabled={!filtered.length}><FileText size={14} /> EXPORT PDF</Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
          <div className="relative col-span-2">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-t3" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search incidents…" className="pl-9" />
          </div>
          <Select aria-label="Time range" value={range} onChange={(v) => { setRange(v); setPage(1); }} options={[
            { value: "ALL", label: "All time" }, { value: "1H", label: "Last hour" }, { value: "24H", label: "Last 24 hours" }, { value: "7D", label: "Last 7 days" },
          ]} />
          <Select aria-label="Detection type" value={type} onChange={(v) => { setType(v); setPage(1); }} options={[{ value: "ALL", label: "All types" }, ...types.map((t) => ({ value: t, label: t }))]} />
          <Select aria-label="Source" value={source} onChange={(v) => { setSource(v); setPage(1); }} options={[{ value: "ALL", label: "All sources" }, ...sources.map((t) => ({ value: t, label: t }))]} />
          <Select aria-label="Min confidence" value={minConf} onChange={(v) => { setMinConf(v); setPage(1); }} options={[
            { value: "0", label: "Any confidence" }, { value: "70", label: "≥ 70%" }, { value: "80", label: "≥ 80%" }, { value: "90", label: "≥ 90%" }, { value: "95", label: "≥ 95%" },
          ]} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {sevFilter}
          <Button variant="ghost" size="sm" onClick={reset} disabled={!hasFilters}><RotateCcw size={13} /> Reset Filters</Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[52px] w-full" />)}</div>
        ) : rows.length === 0 ? (
          <div className="py-10">
            <EmptyState
              icon={<ShieldCheck size={24} />}
              title={hasFilters ? "No matching incidents" : "No threats detected"}
              sub={hasFilters ? "Try widening the filters or resetting them." : "AI monitoring is active and the environment appears safe. Real detections will be logged here."}
            />
            {hasFilters && <div className="flex justify-center"><Button variant="outline" size="sm" onClick={reset}>RESET FILTERS</Button></div>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="bg-[#0D1420]">
                  {["TIMESTAMP", "DETECTION", "CONFIDENCE", "SOURCE", "SEVERITY", "STATUS", "SCREENSHOT", ""].map((h, i) => (
                    <th key={h || i} className="px-5 py-3 font-mono text-[10px] font-semibold tracking-[0.14em] text-t3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => <LogRow key={i.id} i={i} now={s.now} onView={() => s.setOpenIncidentId(i.id)} onReview={() => s.reviewIncident(i.id)} onDelete={() => s.deleteIncident(i.id)} />)}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > PAGE_SIZE && (
          <div className="border-t border-line p-4">
            <Pagination page={pageSafe} pages={pages} onPage={setPage} total={filtered.length} shown={rows.length} />
          </div>
        )}
      </Card>
    </div>
  );
}

function LogRow({ i, now, onView, onReview, onDelete }: { i: Incident; now: number; onView: () => void; onReview: () => void; onDelete: () => void }) {
  const high = i.severity === "HIGH" || i.severity === "CRITICAL";
  return (
    <tr className={cxRow(high)}>
      <td className="px-5 py-3.5">
        <span className="block font-mono text-[12.5px] tabular-nums text-t1">{fmtTime(i.time)}</span>
        <span className="block font-mono text-[10px] text-t3">{timeAgo(i.time, now)}</span>
      </td>
      <td className="px-5 py-3.5">
        <span className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold capitalize text-t1">{i.label}</span>
          <span className="font-mono text-[10px] text-t3">{i.id}</span>
        </span>
      </td>
      <td className="px-5 py-3.5 font-mono text-[12.5px] font-bold" style={{ color: high ? "#FF3B4D" : "#FF9F1C" }}>{i.confidence.toFixed(1)}%</td>
      <td className="px-5 py-3.5">
        <span className="block font-mono text-[12px] text-pri">{i.sourceId}</span>
        <span className="block max-w-[180px] truncate text-[11px] text-t3">{i.sourceName}</span>
      </td>
      <td className="px-5 py-3.5"><SevBadge sev={i.severity} pulse={i.severity === "CRITICAL"} /></td>
      <td className="px-5 py-3.5">
        <span className={cxStatus(i.status)}>{i.status.toUpperCase()}</span>
      </td>
      <td className="px-5 py-3.5">
        {i.img ? (
          <button onClick={onView} aria-label="View screenshot">
            <img src={i.img} alt="" className="h-10 w-[62px] rounded border border-line object-cover transition-transform duration-150 hover:scale-105" />
          </button>
        ) : (
          <span className="font-mono text-[9.5px] text-t3">ARCHIVED</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="secondary" size="sm" onClick={onView}><Eye size={12} /> View</Button>
          <Dropdown
            align="right"
            button={
              <button aria-label="Row actions" className="flex h-8 w-8 items-center justify-center rounded-lg text-t2 transition-colors hover:bg-white/5 hover:text-t1">
                <MoreHorizontal size={15} />
              </button>
            }
            items={[
              { label: "View details", icon: <Eye size={13} />, onClick: onView },
              { label: i.status === "Reviewed" ? "Reviewed" : "Mark reviewed", icon: <CheckCircle2 size={13} />, onClick: onReview },
              { label: "Delete", icon: <Trash2 size={13} />, danger: true, onClick: onDelete },
            ]}
          />
        </div>
      </td>
    </tr>
  );
}

function cxRow(high: boolean) {
  return `group border-t border-line transition-colors duration-100 hover:bg-pri/4 ${high ? "border-l-2 border-l-threat" : "border-l-2 border-l-transparent"}`;
}
function cxStatus(st: Incident["status"]) {
  return `rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider ${st === "New" ? "bg-threat/12 text-threat" : st === "Reviewing" ? "bg-warn/12 text-warn" : "bg-safe/12 text-safe"}`;
}

export { fmtDateTime };
