import React from "react";
import { Play, Square, Camera as SnapIcon, Maximize2, Circle } from "lucide-react";
import { useStore } from "./store";
import { Button, cx } from "./ui";
import { pad2 } from "./data";

export function DetectionControls({ compact }: { compact?: boolean }) {
  const s = useStore();
  const elapsed = s.recording ? Math.max(0, Math.floor((s.now - s.recStart) / 1000)) : 0;
  const recLabel = s.recording ? `${pad2(Math.floor(elapsed / 60))}:${pad2(elapsed % 60)}` : "";

  return (
    <div className={cx("flex flex-wrap items-center gap-2.5", compact && "gap-2")}>
      {s.running ? (
        <Button variant="primary" size="md" disabled className="min-w-[150px]">
          <Play size={14} /> DETECTION RUNNING
        </Button>
      ) : (
        <Button variant="primary" size="md" className="min-w-[150px]" onClick={s.startDetection}>
          <Play size={14} /> START DETECTION
        </Button>
      )}
      <Button variant="danger" size="md" disabled={!s.running} onClick={s.stopDetection}>
        <Square size={13} /> STOP
      </Button>
      <Button variant="secondary" size="md" onClick={() => s.snapshot()}>
        <SnapIcon size={14} /> SNAPSHOT
      </Button>
      <Button
        variant="secondary"
        size="md"
        onClick={s.toggleRecord}
        className={cx(s.recording && "border-threat/50 text-threat")}
      >
        <span className={cx("h-2.5 w-2.5 rounded-full", s.recording ? "anim-blink bg-threat" : "bg-t3")}>
          <Circle size={0} />
        </span>
        {s.recording ? `RECORDING ${recLabel}` : "RECORD"}
      </Button>
      <Button variant="ghost" size="md" onClick={() => s.setFullscreen(true)} aria-label="Fullscreen">
        <Maximize2 size={15} /> {!compact && "FULLSCREEN"}
      </Button>
    </div>
  );
}
