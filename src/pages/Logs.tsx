import React, { useEffect, useMemo, useState } from "react";
import { Search, RotateCcw, FileDown, FileText, Eye, CheckCircle2, Download, MoreHorizontal } from "lucide-react";
import { useStore } from "../lib/store";
import { Card, Button, Input, Select, SevBadge, Pagination, Skeleton, cx } from "../lib/ui";
import {
  SEV, fmtTime, fmtDateTime, incidentsToCsv, incidentsToPdf, downloadBlob, timeAgo, type Incident,
} from "../lib/data";

const PAGE_SIZE = 8;

function StatusChip({ st }: { st: Incident["status"] }) {
  const map = {
    New: { c: "#FF9F1C", bg: "rgba(255,159,28,0.12)" },
    Reviewing: { c: "#38BDF8", bg: "rgba(56,189,248,0.12)" },
    Reviewed: { c: "#20E3A2", bg: "rgba(32,227,162,0.12)" },
  }[st];
  return (
    <span className="rounded-md px-2 py-0.5 font-mono text-[10.5px] font-semibold" style={{ color: map.c, background: map.bg }}>
      {st.toUpperCase()}
    </span>
  );
}

export default function Logs() {
  const s = useStore();
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [range, setRange] = useState("All time");
  const [type, setType] = useState("All types");
  const [sev, setSev] = useState("All severities");
  const [cam, setCam] = useState("All cameras");
  const [conf, setConf] = useState("Any confidence");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 850);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return s.incidents.filter((i) => {
      if (q && !`${i.id} ${i.type} ${i.cameraId} ${i.cameraName}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (type !== "All types" && i.type !== type) return false;
      if (sev !== "All severities" && i.severity !== sev) return false;
      if (cam !== "All cameras" && i.cameraId !== cam) return false;
      const minConf = conf === "Any confidence" ? 0 : parseInt(conf.replace("≥ ", ""), 10);
      if (i.confidence < minConf) return false;
      const ageH = (now - i.time) / 3_600_000;
      if (range === "Today" && ageH > 24) return false;
      if (range === "Last 7 days" && ageH > 24 * 7) return false;
      if (range === "Last 30 days" && ageH > 24 * 30) return false;
      return true;
    });
  }, [s.incidents, q, range, type, sev, cam, conf]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const rows = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const reset = () => { setQ(""); setRange("All time"); setType("All types"); setSev("All severities"); setCam("All cameras"); setConf("Any confidence"); setPage(1); };

  const exportCsv = () => {
    downloadBlob(`safehaven_threat_log_${Date.now()}.csv`, incidentsToCsv(filtered));
    s.toast("success", "Export completed", `${filtered.length} events exported to CSV.`);
  };
  const exportPdf = () => {
    downloadBlob(`safehaven_threat_log_${Date.now()}.pdf`, incidentsToPdf(filtered));
    s.toast("success", "Export completed", `${filtered.length} events exported to PDF.`);
  };

  return (
    <div className="space-y-5">
      {/* filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t3" />
            <Input placeholder="Search incidents…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-10" />
          </div>
          <Select ariaLabel="Date range" className="w-[148px]" value={range} onChange={(v) => { setRange(v); setPage(1); }}
            options={["All time", "Today", "Last 7 days", "Last 30 days"].map((o) => ({ value: o, label: o }))} />
          <Select ariaLabel="Weapon type" className="w-[168px]" value={type} onChange={(v) => { setType(v); setPage(1); }}
            options={["All types", "Potential Weapon", "Knife", "Other Threat"].map((o) => ({ value: o, label: o }))} />
          <Select ariaLabel="Severity" className="w-[148px]" value={sev} onChange={(v) => { setSev(v); setPage(1); }}
            options={["All severities", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((o) => ({ value: o, label: o }))} />
          <Select ariaLabel="Camera" className="w-[148px]" value={cam} onChange={(v) => { setCam(v); setPage(1); }}
            options={[{ value: "All cameras", label: "All cameras" }, ...s.cameras.map((c) => ({ value: c.id, label: c.id }))]} />
          <Select ariaLabel="Minimum confidence" className="w-[158px]" value={conf} onChange={(v) => { setConf(v); setPage(1); }}
            options={["Any confidence", "≥ 70", "≥ 80", "≥ 90", "≥ 95"].map((o) => ({ value: o, label: o }))} />
          <Button variant="ghost" size="md" onClick={reset}><RotateCcw size={13} /> Reset Filters</Button>
        </div>
      </Card>

      {/* table */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h3 className="text-[13px] font-bold tracking-[0.08em] text-t1">DETECTION EVENTS</h3>
            <p className="mt-0.5 font-mono text-[10.5px] text-t3">{filtered.length} EVENTS · SORTED BY LATEST</p>
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="md" onClick={exportCsv}><FileDown size={14} /> EXPORT CSV</Button>
            <Button variant="secondary" size="md" onClick={exportPdf}><FileText size={14} /> EXPORT PDF</Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2.5 p-5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-36" /><Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-20" /><Skeleton className="h-8 w-16" /><Skeleton className="h-8 w-20" />
                <Skeleton className="ml-auto h-9 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead>
                <tr className="bg-[#0D1420]">
                  {["TIMESTAMP", "DETECTION", "CONFIDENCE", "CAMERA", "SEVERITY", "STATUS", "SCREENSHOT", ""].map((h, i) => (
                    <th key={h || i} className="px-5 py-3 font-mono text-[10px] font-semibold tracking-[0.14em] text-t3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => {
                  const hot = i.severity === "HIGH" || i.severity === "CRITICAL";
                  return (
                    <tr
                      key={i.id}
                      onClick={() => s.setOpenIncidentId(i.id)}
                      className="group cursor-pointer border-t border-line transition-colors duration-100 hover:bg-pri/4"
                    >
                      <td className="relative px-5 py-3.5">
                        {hot && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-threat" />}
                        <span className="block font-mono text-[12px] font-semibold tabular-nums text-t1">{fmtTime(i.time)}</span>
                        <span className="block font-mono text-[9.5px] text-t3">{timeAgo(i.time, s.now)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block text-[13px] font-semibold text-t1">{i.type}</span>
                        <span className="block font-mono text-[9.5px] text-t3">{i.id}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12.5px] font-bold tabular-nums" style={{ color: SEV[i.severity].color }}>
                        {i.confidence.toFixed(1)}%
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block font-mono text-[11.5px] font-semibold text-pri">{i.cameraId}</span>
                        <span className="block max-w-[140px] truncate text-[10.5px] text-t3">{i.cameraName.split("— ")[1]}</span>
                      </td>
                      <td className="px-5 py-3.5"><SevBadge sev={i.severity} pulse /></td>
                      <td className="px-5 py-3.5"><StatusChip st={i.status} /></td>
                      <td className="px-5 py-3.5">
                        <img src={i.img} alt="" className="h-9 w-14 rounded border border-line object-cover" style={{ filter: "saturate(0.7)" }} />
                      </td>
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <span className="flex items-center gap-1 opacity-60 transition-opacity duration-150 group-hover:opacity-100">
                          <Button variant="ghost" size="sm" onClick={() => s.setOpenIncidentId(i.id)}><Eye size={13} /> View</Button>
                          <span className="hidden xl:inline-flex">
                            <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
                              <DropdownRow i={i} />
                            </span>
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <p className="text-[13.5px] font-semibold text-t2">No events match the current filters</p>
                      <p className="mt-1 text-[12px] text-t3">Try widening the date range or clearing the search.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="border-t border-line">
            <Pagination page={cur} pages={pages} onPage={setPage} total={filtered.length} shown={rows.length} />
          </div>
        )}
      </Card>
      <span className={cx("hidden")} aria-hidden />
      <p className="font-mono text-[10.5px] tracking-wider text-t3">
        TIP — PRESS <kbd className="rounded border border-line bg-ink px-1.5 py-0.5 text-pri">L</kbd> ANYWHERE TO OPEN THREAT LOGS
      </p>
    </div>
  );
}

import { Dropdown } from "../lib/ui";

function DropdownRow({ i }: { i: Incident }) {
  const s = useStore();
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <Dropdown
        button={
          <button aria-label="Row actions" className="flex h-8 w-8 items-center justify-center rounded-lg text-t2 transition-colors hover:bg-white/5 hover:text-t1">
            <MoreHorizontal size={15} />
          </button>
        }
        items={[
          { label: "View incident", icon: <Eye size={13} />, onClick: () => s.setOpenIncidentId(i.id) },
          { label: "Mark reviewed", icon: <CheckCircle2 size={13} />, onClick: () => s.reviewIncident(i.id) },
          { label: "Download snapshot", icon: <Download size={13} />, onClick: () => s.snapshot(i.cameraId) },
        ]}
      />
    </span>
  );
}
