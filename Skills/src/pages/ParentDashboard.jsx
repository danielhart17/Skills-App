import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ParentChild,
  Lesson,
  UserProgress,
  PlayerGameStats,
  ShootingSession,
} from "@/api/entities";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Users,
  Brain,
  BarChart3,
  Target,
  Link2,
  Loader2,
  CheckCircle2,
  RotateCcw,
  Undo2,
  ChevronDown,
  ChevronRight,
  Play,
  Pause,
  Square,
} from "lucide-react";

/** Public asset from `public/images` (Vite root URL). */
const courtImg = "/images/half-court.png";

const BRAND_ORANGE = "#E85D04";

const INITIAL_LIVE_BOX = {
  points: 0,
  rebounds: 0,
  assists: 0,
  steals: 0,
  blocks: 0,
  turnovers: 0,
  fg_made: 0,
  fg_attempted: 0,
  three_made: 0,
  three_attempted: 0,
  ft_made: 0,
  ft_attempted: 0,
};

function safePct(made, att) {
  if (!att || att <= 0) return 0;
  return (made / att) * 100;
}

function classifyShotZone(xPct, yPct) {
  const inPaint =
    yPct <= 50 && xPct >= 100 / 2 - 45 / 2 && xPct <= 100 / 2 + 45 / 2;
  if (inPaint) return "paint";
  const wing = xPct <= 22 || xPct >= 78;
  const upper = yPct <= 55;
  const deepOrWingThree = yPct <= 42 && (wing || yPct <= 28);
  if (!inPaint && upper && (wing || deepOrWingThree)) return "three";
  return "mid";
}

function xpProgressForLevel(level, totalXp) {
  const lv = Math.max(1, level || 1);
  const xp = totalXp ?? 0;
  const floor = (lv - 1) * 100;
  const ceil = lv * 100;
  if (ceil <= floor) return { pct: 100, toNext: 0 };
  const pct = Math.min(100, Math.max(0, ((xp - floor) / (ceil - floor)) * 100));
  return { pct, toNext: Math.max(0, ceil - xp) };
}

// —— Shooting session zones (same as ShootingSession.jsx) ——
const COURT_ZONES = [
  {
    id: "left-corner",
    name: "Left Corner",
    color: "rgba(128, 128, 128, 0.5)",
    hoverColor: "rgba(128, 128, 128, 0.7)",
    path: "M 0 5 L 0 40 L 10.5 35 Q 7.5 30 8 5 Z",
  },
  {
    id: "right-corner",
    name: "Right Corner",
    color: "rgba(128, 128, 128, 0.5)",
    hoverColor: "rgba(128, 128, 128, 0.7)",
    path: "M 92 5 Q 92.5 30 89.5 35 L 100 40 L 100 5 Z",
  },
  {
    id: "left-mid",
    name: "Left Mid",
    color: "rgba(59, 130, 246, 0.5)",
    hoverColor: "rgba(59, 130, 246, 0.7)",
    path: "M 8 5 Q 7.5 30 10.5 35 L 25 28 L 25 5 Z",
  },
  {
    id: "right-mid",
    name: "Right Mid",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 75 5 L 75 28 L 89.5 35 Q 92.5 30  92 5 Z",
  },
  {
    id: "left-inside",
    name: "Left Inside",
    color: "rgba(59, 130, 246, 0.5)",
    hoverColor: "rgba(59, 130, 246, 0.7)",
    path: "M 25 5 L 40 5 Q 39 21 43 24 L 30 36 Q 25 31 25 27 L 25 5 Z",
  },
  {
    id: "inside",
    name: "Inside",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 43 24 Q 50 29.5 57 24 L 70 36 Q 67.5 39 63 41 Q 50 44.5 37 41 Q 32.5 39 30 36 L 43 24 Z",
  },
  {
    id: "right-inside",
    name: "Right Inside",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 75 5 L 60 5 Q 61 21 57 24 L 70 36 Q 75 31 75 27  L 75 5 Z",
  },
  {
    id: "restricted",
    name: "Restricted Area",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 40 5 L 40 17 A 3 3 0 1 0 60 17 L 60 5 Z",
  },
  {
    id: "top-key",
    name: "Top of Key",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 30 55 L 20 100 L 80 100 L 70 55 Q 50 64 30 55 Z",
  },
  {
    id: "free-throw",
    name: "Free Throw",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 37 41 L 30 55 Q 50 64 70 55 L 63 41 Q 50 45 37 41 Z",
  },
  {
    id: "left-elbow",
    name: "Left Elbow",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 10.5 35 L 25 28 Q 27 35 37 41 L 30 55 Q 18 50 10.5 35 Z",
  },
  {
    id: "right-elbow",
    name: "Right Elbow",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 89.5 35 L 75 28 Q 73 35 63 41 L 70 55 Q 82 50 89.5 35 Z",
  },
  {
    id: "left-wing",
    name: "Left Wing",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 10.5 35 L 0 40 L 0 100 L 20 100 L 30 55 Q 18 50 10.5 35 Z",
  },
  {
    id: "right-wing",
    name: "Right Wing",
    color: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.7)",
    path: "M 89.5 35 L 100 40 L 100 100 L 80 100 L 70 55 Q 82 50 89.5 35 Z",
  },
];

function getZoneLabelPosition(zoneId) {
  const positions = {
    "left-corner": { x: 5, y: 20 },
    "right-corner": { x: 95, y: 20 },
    "left-mid": { x: 17, y: 15 },
    "right-mid": { x: 83, y: 15 },
    "left-inside": { x: 33, y: 18 },
    inside: { x: 50, y: 34 },
    "right-inside": { x: 67, y: 18 },
    restricted: { x: 50, y: 18 },
    "top-key": { x: 50, y: 75 },
    "free-throw": { x: 50, y: 50 },
    "left-elbow": { x: 25, y: 42 },
    "right-elbow": { x: 75, y: 42 },
    "left-wing": { x: 12, y: 70 },
    "right-wing": { x: 88, y: 70 },
  };
  return positions[zoneId] || { x: 50, y: 50 };
}

function formatSessionTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function ParentDashboard() {
  const { isParent } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("progress");

  // —— Child progress ——
  const [linkedChildren, setLinkedChildren] = useState([]);
  const [childSummaries, setChildSummaries] = useState({});
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [linkCode, setLinkCode] = useState("");
  const [linkingChild, setLinkingChild] = useState(false);

  // —— IQ ——
  const [iqLessons, setIqLessons] = useState([]);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [loadingIq, setLoadingIq] = useState(false);

  // —— Game stats (live tracker) ——
  const [gameStatsChildId, setGameStatsChildId] = useState("");
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [expandedGameId, setExpandedGameId] = useState(null);
  const [savingGame, setSavingGame] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];
  const [gameMeta, setGameMeta] = useState({
    game_date: todayStr,
    opponent: "",
    notes: "",
    minutes_played: "",
  });
  const [liveBox, setLiveBox] = useState(() => ({ ...INITIAL_LIVE_BOX }));
  const [liveShotChart, setLiveShotChart] = useState([]);
  const [playLog, setPlayLog] = useState([]);
  const playLogSeq = useRef(0);
  const undoStackRef = useRef([]);
  const [, bumpUndoVersion] = useState(0);
  const [pendingShot, setPendingShot] = useState(null);

  // —— Shooting session (child) ——
  const [shootChildId, setShootChildId] = useState("");
  const [ssActive, setSsActive] = useState(false);
  const [ssShots, setSsShots] = useState([]);
  const [ssZoneStats, setSsZoneStats] = useState({});
  const [ssSelectedZone, setSsSelectedZone] = useState(null);
  const [ssHoveredZone, setSsHoveredZone] = useState(null);
  const [ssTime, setSsTime] = useState(0);
  const ssTimerRef = useRef(null);

  useEffect(() => {
    if (!isParent()) {
      navigate("/Home");
    }
  }, [isParent, navigate]);

  const loadLinkedChildren = useCallback(async () => {
    setLoadingChildren(true);
    try {
      const rows = await ParentChild.getLinkedChildren();
      setLinkedChildren(rows || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load linked children");
      setLinkedChildren([]);
    } finally {
      setLoadingChildren(false);
    }
  }, []);

  useEffect(() => {
    if (isParent()) loadLinkedChildren();
  }, [isParent, loadLinkedChildren]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!linkedChildren.length) {
        setChildSummaries({});
        return;
      }
      const next = {};
      await Promise.all(
        linkedChildren.map(async (c) => {
          try {
            const s = await ParentChild.getChildProgressSummary(c.child_id);
            if (!cancelled) next[c.child_id] = s;
          } catch (err) {
            console.error(err);
          }
        })
      );
      if (!cancelled) setChildSummaries(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [linkedChildren]);

  useEffect(() => {
    if (activeTab !== "iq" || !isParent()) return;
    let cancelled = false;
    (async () => {
      setLoadingIq(true);
      try {
        const [all, completed] = await Promise.all([
          Lesson.list(),
          UserProgress.getCompletedLessons(),
        ]);
        if (cancelled) return;
        setIqLessons(
          (all || []).filter(
            (l) => (l.mode || "").toLowerCase() === "iq"
          )
        );
        setCompletedLessonIds(completed || []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load lessons");
      } finally {
        if (!cancelled) setLoadingIq(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isParent]);

  useEffect(() => {
    if (!gameStatsChildId || activeTab !== "stats") {
      if (activeTab !== "stats") return;
      setGames([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingGames(true);
      try {
        const rows = await PlayerGameStats.list(gameStatsChildId);
        if (!cancelled) setGames(rows || []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load game log");
      } finally {
        if (!cancelled) setLoadingGames(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameStatsChildId, activeTab]);

  useEffect(() => {
    if (linkedChildren.length && !gameStatsChildId) {
      setGameStatsChildId(linkedChildren[0].child_id);
    }
  }, [linkedChildren, gameStatsChildId]);

  useEffect(() => {
    if (linkedChildren.length && !shootChildId) {
      setShootChildId(linkedChildren[0].child_id);
    }
  }, [linkedChildren, shootChildId]);

  useEffect(() => {
    if (ssActive) {
      ssTimerRef.current = setInterval(() => setSsTime((t) => t + 1), 1000);
    } else {
      clearInterval(ssTimerRef.current);
    }
    return () => clearInterval(ssTimerRef.current);
  }, [ssActive]);

  const handleLinkChild = async () => {
    if (!linkCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }
    setLinkingChild(true);
    try {
      const result = await ParentChild.linkByCode(linkCode.trim());
      toast.success(`Linked to ${result.child_name || "athlete"}!`);
      setLinkCode("");
      loadLinkedChildren();
    } catch (e) {
      toast.error(e.message || "Could not link with that code");
    } finally {
      setLinkingChild(false);
    }
  };

  const pushPlayLog = (text) => {
    playLogSeq.current += 1;
    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setPlayLog((prev) => [
      ...prev,
      { id: playLogSeq.current, t: timeStr, text },
    ]);
  };

  const pushUndo = (entry) => {
    undoStackRef.current = [...undoStackRef.current, entry];
    bumpUndoVersion((n) => n + 1);
  };

  const applyUndoEntry = (entry) => {
    setPlayLog((prev) => (prev.length ? prev.slice(0, -1) : prev));
    switch (entry.type) {
      case "fg": {
        setLiveShotChart((prev) =>
          prev.length ? prev.slice(0, -1) : prev
        );
        const mode = entry.mode;
        setLiveBox((p) => {
          const n = { ...p };
          switch (mode) {
            case "2pt-make":
              n.points = Math.max(0, n.points - 2);
              n.fg_made = Math.max(0, n.fg_made - 1);
              n.fg_attempted = Math.max(0, n.fg_attempted - 1);
              break;
            case "2pt-miss":
              n.fg_attempted = Math.max(0, n.fg_attempted - 1);
              break;
            case "3pt-make":
              n.points = Math.max(0, n.points - 3);
              n.three_made = Math.max(0, n.three_made - 1);
              n.three_attempted = Math.max(0, n.three_attempted - 1);
              n.fg_made = Math.max(0, n.fg_made - 1);
              n.fg_attempted = Math.max(0, n.fg_attempted - 1);
              break;
            case "3pt-miss":
              n.three_attempted = Math.max(0, n.three_attempted - 1);
              n.fg_attempted = Math.max(0, n.fg_attempted - 1);
              break;
            default:
              break;
          }
          return n;
        });
        break;
      }
      case "ft_make":
        setLiveBox((p) => ({
          ...p,
          points: Math.max(0, p.points - 1),
          ft_made: Math.max(0, p.ft_made - 1),
          ft_attempted: Math.max(0, p.ft_attempted - 1),
        }));
        break;
      case "ft_miss":
        setLiveBox((p) => ({
          ...p,
          ft_attempted: Math.max(0, p.ft_attempted - 1),
        }));
        break;
      case "reb":
        setLiveBox((p) => ({
          ...p,
          rebounds: Math.max(0, p.rebounds - 1),
        }));
        break;
      case "ast":
        setLiveBox((p) => ({
          ...p,
          assists: Math.max(0, p.assists - 1),
        }));
        break;
      case "stl":
        setLiveBox((p) => ({
          ...p,
          steals: Math.max(0, p.steals - 1),
        }));
        break;
      case "blk":
        setLiveBox((p) => ({
          ...p,
          blocks: Math.max(0, p.blocks - 1),
        }));
        break;
      case "to":
        setLiveBox((p) => ({
          ...p,
          turnovers: Math.max(0, p.turnovers - 1),
        }));
        break;
      default:
        break;
    }
  };

  const undoLastEntry = () => {
    if (pendingShot || !undoStackRef.current.length) return;
    const stack = undoStackRef.current;
    const entry = stack[stack.length - 1];
    undoStackRef.current = stack.slice(0, -1);
    bumpUndoVersion((n) => n + 1);
    applyUndoEntry(entry);
    toast.info("Undid last play");
  };

  const canUndo = !pendingShot && undoStackRef.current.length > 0;

  const resetLiveTracker = () => {
    undoStackRef.current = [];
    bumpUndoVersion((n) => n + 1);
    setLiveBox({ ...INITIAL_LIVE_BOX });
    setLiveShotChart([]);
    setPlayLog([]);
    setPendingShot(null);
    setGameMeta((m) => ({
      ...m,
      game_date: new Date().toISOString().split("T")[0],
      opponent: "",
      notes: "",
      minutes_played: "",
    }));
  };

  const handlePendingCourtClick = (e) => {
    if (!pendingShot) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    const zone = classifyShotZone(x, y);
    const isThree = pendingShot.startsWith("3pt");
    const isMake = pendingShot.endsWith("make");
    const shotEntry = {
      x,
      y,
      zone,
      type: isMake ? "make" : "miss",
      shot_kind: isThree ? "3pt" : "2pt",
    };
    setLiveShotChart((prev) => [...prev, shotEntry]);

    setLiveBox((p) => {
      const n = { ...p };
      switch (pendingShot) {
        case "2pt-make":
          n.points += 2;
          n.fg_made += 1;
          n.fg_attempted += 1;
          break;
        case "2pt-miss":
          n.fg_attempted += 1;
          break;
        case "3pt-make":
          n.points += 3;
          n.three_made += 1;
          n.three_attempted += 1;
          n.fg_made += 1;
          n.fg_attempted += 1;
          break;
        case "3pt-miss":
          n.three_attempted += 1;
          n.fg_attempted += 1;
          break;
        default:
          break;
      }
      return n;
    });

    const labels = {
      "2pt-make": "2PT make (+2)",
      "2pt-miss": "2PT miss",
      "3pt-make": "3PT make (+3)",
      "3pt-miss": "3PT miss",
    };
    pushPlayLog(labels[pendingShot] || pendingShot);
    pushUndo({ type: "fg", mode: pendingShot });
    setPendingShot(null);
  };

  const logFTMake = () => {
    setLiveBox((p) => ({
      ...p,
      points: p.points + 1,
      ft_made: p.ft_made + 1,
      ft_attempted: p.ft_attempted + 1,
    }));
    pushPlayLog("FT make (+1)");
    pushUndo({ type: "ft_make" });
  };

  const logFTMiss = () => {
    setLiveBox((p) => ({
      ...p,
      ft_attempted: p.ft_attempted + 1,
    }));
    pushPlayLog("FT miss");
    pushUndo({ type: "ft_miss" });
  };

  const logRebound = () => {
    setLiveBox((p) => ({ ...p, rebounds: p.rebounds + 1 }));
    pushPlayLog("Rebound");
    pushUndo({ type: "reb" });
  };
  const logAssist = () => {
    setLiveBox((p) => ({ ...p, assists: p.assists + 1 }));
    pushPlayLog("Assist");
    pushUndo({ type: "ast" });
  };
  const logSteal = () => {
    setLiveBox((p) => ({ ...p, steals: p.steals + 1 }));
    pushPlayLog("Steal");
    pushUndo({ type: "stl" });
  };
  const logBlock = () => {
    setLiveBox((p) => ({ ...p, blocks: p.blocks + 1 }));
    pushPlayLog("Block");
    pushUndo({ type: "blk" });
  };
  const logTurnover = () => {
    setLiveBox((p) => ({ ...p, turnovers: p.turnovers + 1 }));
    pushPlayLog("Turnover");
    pushUndo({ type: "to" });
  };

  const handleSaveGame = async () => {
    if (!gameStatsChildId) {
      toast.error("Select a child");
      return;
    }
    setSavingGame(true);
    try {
      await PlayerGameStats.create({
        child_id: gameStatsChildId,
        game_date: gameMeta.game_date || todayStr,
        opponent: gameMeta.opponent?.trim() || null,
        points: liveBox.points,
        rebounds: liveBox.rebounds,
        assists: liveBox.assists,
        steals: liveBox.steals,
        blocks: liveBox.blocks,
        turnovers: liveBox.turnovers,
        minutes_played: Number(gameMeta.minutes_played) || 0,
        fg_made: liveBox.fg_made,
        fg_attempted: liveBox.fg_attempted,
        three_made: liveBox.three_made,
        three_attempted: liveBox.three_attempted,
        ft_made: liveBox.ft_made,
        ft_attempted: liveBox.ft_attempted,
        shot_chart: liveShotChart,
        notes: gameMeta.notes?.trim() || null,
      });
      toast.success("Game saved");
      resetLiveTracker();
      const rows = await PlayerGameStats.list(gameStatsChildId);
      setGames(rows || []);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to save game");
    } finally {
      setSavingGame(false);
    }
  };

  const renderShotMarkers = (shots) =>
    (Array.isArray(shots) ? shots : []).map((s, i) => (
      <div
        key={i}
        className="absolute pointer-events-none"
        style={{
          left: `${s.x}%`,
          top: `${s.y}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {s.type === "make" ? (
          <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow" />
        ) : (
          <span className="text-red-500 font-black text-lg leading-none drop-shadow-md">
            ✕
          </span>
        )}
      </div>
    ));

  const careerRow = (() => {
    if (!games.length) return null;
    const n = games.length;
    const sum = (k) => games.reduce((a, g) => a + (Number(g[k]) || 0), 0);
    const tFgM = sum("fg_made");
    const tFgA = sum("fg_attempted");
    const t3M = sum("three_made");
    const t3A = sum("three_attempted");
    const tFtM = sum("ft_made");
    const tFtA = sum("ft_attempted");
    return {
      label: "Career avg",
      points: sum("points") / n,
      rebounds: sum("rebounds") / n,
      assists: sum("assists") / n,
      steals: sum("steals") / n,
      blocks: sum("blocks") / n,
      fgPct: safePct(tFgM, tFgA),
      tpPct: safePct(t3M, t3A),
      ftPct: safePct(tFtM, tFtA),
    };
  })();

  const iqCompletedCount = iqLessons.filter((l) =>
    completedLessonIds.includes(l.id)
  ).length;

  // —— Child shooting session handlers ——
  const ssHandleZoneClick = (zoneId) => {
    if (!ssActive) return;
    setSsSelectedZone(zoneId);
  };

  const ssRecordShot = (made) => {
    if (!ssSelectedZone) return;
    const newShot = {
      zone: ssSelectedZone,
      made,
      timestamp: new Date().toISOString(),
    };
    setSsShots((prev) => [...prev, newShot]);
    setSsZoneStats((prev) => {
      const cur = prev[ssSelectedZone] || { made: 0, attempts: 0 };
      return {
        ...prev,
        [ssSelectedZone]: {
          made: cur.made + (made ? 1 : 0),
          attempts: cur.attempts + 1,
        },
      };
    });
    setSsSelectedZone(null);
  };

  const ssStart = () => {
    setSsActive(true);
    setSsShots([]);
    setSsZoneStats({});
    setSsSelectedZone(null);
    setSsTime(0);
  };

  const ssEnd = async () => {
    setSsActive(false);
    if (!shootChildId) {
      toast.error("Select a child to log for");
      return;
    }
    if (ssShots.length === 0) {
      toast.info("No shots to save");
      return;
    }
    const made = ssShots.filter((s) => s.made).length;
    const pct = safePct(made, ssShots.length);
    try {
      await ShootingSession.createForChild(shootChildId, {
        date: new Date().toISOString().split("T")[0],
        shots_data: ssShots,
        zone_stats: ssZoneStats,
        total_shots: ssShots.length,
        made_shots: made,
        shooting_percentage: pct,
        duration_seconds: ssTime,
      });
      toast.success("Shooting session saved for your athlete");
      setSsShots([]);
      setSsZoneStats({});
      setSsTime(0);
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Could not save session");
    }
  };

  const ssMade = ssShots.filter((s) => s.made).length;
  const ssPct =
    ssShots.length > 0 ? Math.round((ssMade / ssShots.length) * 100) : 0;

  const selectedShootChild = linkedChildren.find(
    (c) => c.child_id === shootChildId
  );

  if (!isParent()) return null;

  const primaryBtn =
    "text-white font-semibold shadow-md hover:opacity-95 disabled:opacity-50";
  const primaryStyle = { backgroundColor: BRAND_ORANGE };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Users className="w-8 h-8" style={{ color: BRAND_ORANGE }} />
          Parent Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your athletes, learn IQ lessons, and log games & shooting.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-1 bg-card p-1 rounded-lg border border-border">
          <TabsTrigger
            value="progress"
            className="data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Child Progress
          </TabsTrigger>
          <TabsTrigger
            value="iq"
            className="data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            IQ Courses
          </TabsTrigger>
          <TabsTrigger
            value="stats"
            className="data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Game Stats
          </TabsTrigger>
          <TabsTrigger
            value="shooting"
            className="data-[state=active]:bg-[#E85D04] data-[state=active]:text-white data-[state=active]:shadow-md"
          >
            Shooting Session
          </TabsTrigger>
        </TabsList>

        {/* TAB 1 */}
        <TabsContent value="progress" className="space-y-8">
          {loadingChildren ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-xl bg-card border border-border animate-pulse"
                />
              ))}
            </div>
          ) : linkedChildren.length === 0 ? (
            <Card className="border-0 shadow-xl bg-card border border-border">
              <CardContent className="py-16 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-white mb-2">
                  No linked athletes yet
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Ask your athlete to open Profile → Parent link, generate an
                  invite code, then enter it below.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {linkedChildren.map((c) => {
                const s = childSummaries[c.child_id] || {};
                const lessons = s.total_lessons_completed ?? 0;
                const chals = s.total_challenges_completed ?? 0;
                const { pct, toNext } = xpProgressForLevel(
                  c.child_level,
                  c.child_xp
                );
                return (
                  <Card
                    key={c.child_id}
                    className="border-0 shadow-xl bg-card border border-border overflow-hidden"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 border-2 border-border">
                          <AvatarFallback
                            className="text-lg font-bold text-white"
                            style={{ backgroundColor: BRAND_ORANGE }}
                          >
                            {(c.child_name || "?")
                              .split(" ")
                              .map((x) => x[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-white text-lg">
                            {c.child_name || "Athlete"}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground">
                            Level {c.child_level ?? 1} · {c.child_xp ?? 0} XP
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm text-muted-foreground mb-1">
                          <span>XP to next level</span>
                          <span>{toNext} XP left</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-white/5 p-3 border border-border">
                          <div className="text-muted-foreground">
                            Lessons done
                          </div>
                          <div className="text-xl font-bold text-white">
                            {lessons}
                          </div>
                        </div>
                        <div className="rounded-lg bg-white/5 p-3 border border-border">
                          <div className="text-muted-foreground">
                            Workouts done
                          </div>
                          <div className="text-xl font-bold text-white">
                            {chals}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="border-0 shadow-xl bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Link2 className="w-5 h-5" style={{ color: BRAND_ORANGE }} />
                Link a child
              </CardTitle>
              <CardDescription>
                Enter the 6-character code from your athlete&apos;s app.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="CODE"
                value={linkCode}
                onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="font-mono tracking-widest uppercase bg-background border-border text-white"
              />
              <Button
                onClick={handleLinkChild}
                disabled={linkingChild}
                className={primaryBtn}
                style={primaryStyle}
              >
                {linkingChild ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Link"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2 */}
        <TabsContent value="iq" className="space-y-6">
          {loadingIq ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-xl bg-card border border-border animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Brain className="w-6 h-6" style={{ color: BRAND_ORANGE }} />
                    IQ curriculum
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {iqCompletedCount} of {iqLessons.length} lessons completed
                  </p>
                </div>
              </div>
              {iqLessons.length === 0 ? (
                <Card className="bg-card border border-border">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No IQ lessons are available yet.
                  </CardContent>
                </Card>
              ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {iqLessons.map((lesson) => {
                  const done = completedLessonIds.includes(lesson.id);
                  return (
                    <Card
                      key={lesson.id}
                      className="border border-border bg-card shadow-lg flex flex-col"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base text-white leading-tight">
                            {lesson.title}
                          </CardTitle>
                          {done && (
                            <CheckCircle2
                              className="w-5 h-5 shrink-0 text-green-400"
                              aria-label="Completed"
                            />
                          )}
                        </div>
                        {lesson.description && (
                          <CardDescription className="line-clamp-2">
                            {lesson.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="mt-auto pt-0 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="bg-white/10">
                          {lesson.xp_reward ?? 0} XP
                        </Badge>
                        {lesson.difficulty && (
                          <Badge variant="outline">{lesson.difficulty}</Badge>
                        )}
                        <Button
                          className={`w-full mt-2 ${primaryBtn}`}
                          style={primaryStyle}
                          onClick={() =>
                            navigate(`/lesson/${lesson.id}/questions`)
                          }
                        >
                          Start lesson
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              )}
            </>
          )}
        </TabsContent>

        {/* TAB 3 */}
        <TabsContent value="stats" className="space-y-6">
          {!linkedChildren.length ? (
            <Card className="bg-card border border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Link an athlete first to log games.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle className="text-white text-lg">
                    Live game tracker
                  </CardTitle>
                  <CardDescription>
                    Log scoring and stats as the game happens. 2PT and 3PT need a
                    court tap; free throws apply instantly.
                  </CardDescription>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    <div>
                      <Label className="text-muted-foreground">Athlete</Label>
                      <Select
                        value={gameStatsChildId}
                        onValueChange={setGameStatsChildId}
                      >
                        <SelectTrigger className="mt-1 bg-background border-border text-white">
                          <SelectValue placeholder="Select child" />
                        </SelectTrigger>
                        <SelectContent>
                          {linkedChildren.map((c) => (
                            <SelectItem key={c.child_id} value={c.child_id}>
                              {c.child_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Date</Label>
                      <Input
                        type="date"
                        className="mt-1 bg-background border-border text-white"
                        value={gameMeta.game_date}
                        onChange={(e) =>
                          setGameMeta((m) => ({
                            ...m,
                            game_date: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Opponent</Label>
                      <Input
                        className="mt-1 bg-background border-border text-white"
                        placeholder="Team name"
                        value={gameMeta.opponent}
                        onChange={(e) =>
                          setGameMeta((m) => ({
                            ...m,
                            opponent: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-muted-foreground">
                        Minutes (optional)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        className="mt-1 bg-background border-border text-white"
                        placeholder="0"
                        value={gameMeta.minutes_played}
                        onChange={(e) =>
                          setGameMeta((m) => ({
                            ...m,
                            minutes_played: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Field goals
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        type="button"
                        className="bg-green-700/80 hover:bg-green-600 text-white border border-green-500/50"
                        disabled={!!pendingShot}
                        onClick={() => setPendingShot("2pt-make")}
                      >
                        2PT make
                      </Button>
                      <Button
                        type="button"
                        className="bg-red-900/70 hover:bg-red-800 text-white border border-red-500/40"
                        disabled={!!pendingShot}
                        onClick={() => setPendingShot("2pt-miss")}
                      >
                        2PT miss
                      </Button>
                      <Button
                        type="button"
                        className="bg-green-700/80 hover:bg-green-600 text-white border border-green-500/50"
                        disabled={!!pendingShot}
                        onClick={() => setPendingShot("3pt-make")}
                      >
                        3PT make
                      </Button>
                      <Button
                        type="button"
                        className="bg-red-900/70 hover:bg-red-800 text-white border border-red-500/40"
                        disabled={!!pendingShot}
                        onClick={() => setPendingShot("3pt-miss")}
                      >
                        3PT miss
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Free throws
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                        disabled={!!pendingShot}
                        onClick={logFTMake}
                      >
                        FT make
                      </Button>
                      <Button
                        type="button"
                        className="bg-rose-700 hover:bg-rose-600 text-white"
                        disabled={!!pendingShot}
                        onClick={logFTMiss}
                      >
                        FT miss
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Other stats
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="bg-white/10 text-white hover:bg-white/15"
                        disabled={!!pendingShot}
                        onClick={logRebound}
                      >
                        Rebound
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="bg-white/10 text-white hover:bg-white/15"
                        disabled={!!pendingShot}
                        onClick={logAssist}
                      >
                        Assist
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="bg-white/10 text-white hover:bg-white/15"
                        disabled={!!pendingShot}
                        onClick={logSteal}
                      >
                        Steal
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="bg-white/10 text-white hover:bg-white/15"
                        disabled={!!pendingShot}
                        onClick={logBlock}
                      >
                        Block
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="bg-white/10 text-white hover:bg-white/15"
                        disabled={!!pendingShot}
                        onClick={logTurnover}
                      >
                        Turnover
                      </Button>
                    </div>
                  </div>

                  {pendingShot && (
                    <div
                      className="rounded-xl border-2 p-4 space-y-3"
                      style={{ borderColor: BRAND_ORANGE }}
                    >
                      <p className="text-center text-white font-semibold">
                        Tap the court where the shot was taken
                      </p>
                      <div
                        role="presentation"
                        className="relative w-full max-w-md mx-auto rounded-lg border-2 border-border overflow-hidden bg-black cursor-crosshair touch-manipulation"
                        style={{ aspectRatio: "1 / 1" }}
                        onClick={handlePendingCourtClick}
                      >
                        <img
                          src={courtImg}
                          alt="Half court"
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                          draggable={false}
                        />
                        {renderShotMarkers(liveShotChart)}
                      </div>
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => setPendingShot(null)}
                        >
                          Cancel shot
                        </Button>
                      </div>
                    </div>
                  )}

                  {!pendingShot && liveShotChart.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Shot chart (2PT / 3PT)
                      </p>
                      <div
                        className="relative w-full max-w-xs rounded-lg border border-border overflow-hidden bg-black opacity-90"
                        style={{ aspectRatio: "1 / 1" }}
                      >
                        <img
                          src={courtImg}
                          alt="Shots"
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          draggable={false}
                        />
                        {renderShotMarkers(liveShotChart)}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <Textarea
                      className="mt-1 bg-background border-border text-white min-h-[72px]"
                      placeholder="Optional game notes…"
                      value={gameMeta.notes}
                      onChange={(e) =>
                        setGameMeta((m) => ({ ...m, notes: e.target.value }))
                      }
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border text-white hover:bg-white/10"
                      disabled={!canUndo || savingGame}
                      onClick={undoLastEntry}
                    >
                      <Undo2 className="w-4 h-4 mr-2" />
                      Undo last
                    </Button>
                    <Button
                      className={`flex-1 min-w-[140px] ${primaryBtn}`}
                      style={primaryStyle}
                      onClick={handleSaveGame}
                      disabled={savingGame || !!pendingShot}
                    >
                      {savingGame ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save game"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border text-white hover:bg-white/10"
                      disabled={!!pendingShot || savingGame}
                      onClick={() => {
                        if (
                          liveBox.points === 0 &&
                          playLog.length === 0 &&
                          liveShotChart.length === 0
                        ) {
                          resetLiveTracker();
                          return;
                        }
                        if (
                          window.confirm(
                            "Clear the current game tracker? This cannot be undone."
                          )
                        ) {
                          resetLiveTracker();
                        }
                      }}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset game
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Box score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
                    {[
                      ["PTS", liveBox.points],
                      ["REB", liveBox.rebounds],
                      ["AST", liveBox.assists],
                      ["STL", liveBox.steals],
                      ["BLK", liveBox.blocks],
                      ["TO", liveBox.turnovers],
                    ].map(([lab, val]) => (
                      <div
                        key={lab}
                        className="rounded-lg bg-white/5 border border-border py-3 px-2"
                      >
                        <div className="text-xs text-muted-foreground">
                          {lab}
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {val}
                        </div>
                      </div>
                    ))}
                    <div className="rounded-lg bg-white/5 border border-border py-3 px-2 col-span-2 sm:col-span-3 md:col-span-2 lg:col-span-3">
                      <div className="text-xs text-muted-foreground">FG</div>
                      <div className="text-lg font-bold text-white">
                        {liveBox.fg_made}/{liveBox.fg_attempted} (
                        {safePct(
                          liveBox.fg_made,
                          liveBox.fg_attempted
                        ).toFixed(0)}
                        %)
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/5 border border-border py-3 px-2 col-span-2 sm:col-span-3 md:col-span-2 lg:col-span-3">
                      <div className="text-xs text-muted-foreground">3PT</div>
                      <div className="text-lg font-bold text-white">
                        {liveBox.three_made}/{liveBox.three_attempted} (
                        {safePct(
                          liveBox.three_made,
                          liveBox.three_attempted
                        ).toFixed(0)}
                        %)
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/5 border border-border py-3 px-2 col-span-2 sm:col-span-3 md:col-span-2 lg:col-span-3">
                      <div className="text-xs text-muted-foreground">FT</div>
                      <div className="text-lg font-bold text-white">
                        {liveBox.ft_made}/{liveBox.ft_attempted} (
                        {safePct(
                          liveBox.ft_made,
                          liveBox.ft_attempted
                        ).toFixed(0)}
                        %)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border border-border">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Play log</CardTitle>
                  <CardDescription>
                    Chronological record of this session (not saved separately).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-black/30 divide-y divide-border">
                    {playLog.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        No plays yet — use the buttons above.
                      </p>
                    ) : (
                      playLog.map((row) => (
                        <div
                          key={row.id}
                          className="flex gap-3 px-3 py-2 text-sm text-white"
                        >
                          <span className="text-muted-foreground font-mono shrink-0 w-[84px]">
                            {row.t}
                          </span>
                          <span>{row.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Game log */}
              <Card className="bg-card border border-border overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" style={{ color: BRAND_ORANGE }} />
                    Game log
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {loadingGames ? (
                    <div className="p-8 flex justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-border bg-white/5 text-muted-foreground">
                          <th className="p-3 w-8" />
                          <th className="p-3">Date</th>
                          <th className="p-3">Opponent</th>
                          <th className="p-3">PTS</th>
                          <th className="p-3">REB</th>
                          <th className="p-3">AST</th>
                          <th className="p-3">STL</th>
                          <th className="p-3">BLK</th>
                          <th className="p-3">FG%</th>
                          <th className="p-3">3P%</th>
                          <th className="p-3">FT%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {games.map((g) => {
                          const open = expandedGameId === g.id;
                          return (
                            <Fragment key={g.id}>
                              <tr
                                className="border-b border-border hover:bg-white/5 cursor-pointer text-white"
                                onClick={() =>
                                  setExpandedGameId(open ? null : g.id)
                                }
                              >
                                <td className="p-3">
                                  {open ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  {g.game_date}
                                </td>
                                <td className="p-3">{g.opponent || "—"}</td>
                                <td className="p-3">{g.points}</td>
                                <td className="p-3">{g.rebounds}</td>
                                <td className="p-3">{g.assists}</td>
                                <td className="p-3">{g.steals}</td>
                                <td className="p-3">{g.blocks}</td>
                                <td className="p-3">
                                  {safePct(
                                    g.fg_made,
                                    g.fg_attempted
                                  ).toFixed(0)}
                                  %
                                </td>
                                <td className="p-3">
                                  {safePct(
                                    g.three_made,
                                    g.three_attempted
                                  ).toFixed(0)}
                                  %
                                </td>
                                <td className="p-3">
                                  {safePct(g.ft_made, g.ft_attempted).toFixed(
                                    0
                                  )}
                                  %
                                </td>
                              </tr>
                              {open && (
                                <tr className="bg-black/20">
                                  <td colSpan={11} className="p-4">
                                    <div
                                      className="relative w-full max-w-md mx-auto rounded-lg border border-border overflow-hidden bg-black"
                                      style={{ aspectRatio: "1 / 1" }}
                                    >
                                      <img
                                        src={courtImg}
                                        alt="Shot chart"
                                        className="absolute inset-0 w-full h-full object-cover"
                                      />
                                      {(Array.isArray(g.shot_chart)
                                        ? g.shot_chart
                                        : []
                                      ).map((s, i) => (
                                        <div
                                          key={i}
                                          className="absolute pointer-events-none"
                                          style={{
                                            left: `${s.x}%`,
                                            top: `${s.y}%`,
                                            transform: "translate(-50%, -50%)",
                                          }}
                                        >
                                          {s.type === "make" ? (
                                            <div className="w-3 h-3 rounded-full bg-green-500 border border-white" />
                                          ) : (
                                            <span className="text-red-500 font-black text-lg">
                                              ✕
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                        {careerRow && (
                          <tr className="bg-white/10 font-semibold text-white border-t-2 border-border">
                            <td className="p-3" />
                            <td className="p-3" colSpan={2}>
                              {careerRow.label}
                            </td>
                            <td className="p-3">
                              {careerRow.points.toFixed(1)}
                            </td>
                            <td className="p-3">
                              {careerRow.rebounds.toFixed(1)}
                            </td>
                            <td className="p-3">
                              {careerRow.assists.toFixed(1)}
                            </td>
                            <td className="p-3">
                              {careerRow.steals.toFixed(1)}
                            </td>
                            <td className="p-3">
                              {careerRow.blocks.toFixed(1)}
                            </td>
                            <td className="p-3">
                              {careerRow.fgPct.toFixed(0)}%
                            </td>
                            <td className="p-3">
                              {careerRow.tpPct.toFixed(0)}%
                            </td>
                            <td className="p-3">
                              {careerRow.ftPct.toFixed(0)}%
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                  {!loadingGames && games.length === 0 && (
                    <p className="p-6 text-center text-muted-foreground">
                      No games logged for this athlete yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* TAB 4 */}
        <TabsContent value="shooting" className="space-y-6">
          {!linkedChildren.length ? (
            <Card className="bg-card border border-border">
              <CardContent className="py-12 text-center text-muted-foreground">
                Link an athlete first to log a shooting session for them.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-card border border-border">
                <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <Label className="text-muted-foreground">
                      Log session for
                    </Label>
                    <Select
                      value={shootChildId}
                      onValueChange={setShootChildId}
                    >
                      <SelectTrigger className="mt-1 bg-background border-border text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {linkedChildren.map((c) => (
                          <SelectItem key={c.child_id} value={c.child_id}>
                            {c.child_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-white pb-2">
                    Logging for:{" "}
                    <span className="font-semibold" style={{ color: BRAND_ORANGE }}>
                      {selectedShootChild?.child_name || "—"}
                    </span>
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Target style={{ color: BRAND_ORANGE }} />
                          Court zones
                        </span>
                        <Badge
                          variant={ssActive ? "default" : "secondary"}
                          className={
                            ssActive ? "text-white" : "text-muted-foreground"
                          }
                          style={
                            ssActive ? { backgroundColor: BRAND_ORANGE } : {}
                          }
                        >
                          {ssActive ? "LIVE" : "PAUSED"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={`relative w-full rounded-lg border-2 border-border overflow-hidden bg-black ${
                          ssActive ? "cursor-pointer" : "cursor-not-allowed"
                        }`}
                        style={{ aspectRatio: "1 / 1" }}
                      >
                        <img
                          src={courtImg}
                          alt="Court"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <svg
                          viewBox="0 0 100 100"
                          className="absolute inset-0 w-full h-full"
                          preserveAspectRatio="none"
                        >
                          {COURT_ZONES.map((zone) => {
                            const stats = ssZoneStats[zone.id];
                            const sel = ssSelectedZone === zone.id;
                            const hov = ssHoveredZone === zone.id;
                            const has = stats && stats.attempts > 0;
                            const pct = has
                              ? (
                                  (stats.made / stats.attempts) *
                                  100
                                ).toFixed(0)
                              : "0";
                            return (
                              <g key={zone.id}>
                                <path
                                  d={zone.path}
                                  fill={
                                    sel
                                      ? "rgba(59, 130, 246, 0.8)"
                                      : hov
                                      ? zone.hoverColor
                                      : has
                                      ? zone.color
                                      : "rgba(255, 255, 255, 0.08)"
                                  }
                                  stroke={
                                    sel || hov
                                      ? "#fff"
                                      : "rgba(255,255,255,0.25)"
                                  }
                                  strokeWidth={sel ? 0.5 : 0.2}
                                  className={
                                    ssActive ? "cursor-pointer" : "pointer-events-none"
                                  }
                                  onClick={() => ssHandleZoneClick(zone.id)}
                                  onMouseEnter={() =>
                                    ssActive && setSsHoveredZone(zone.id)
                                  }
                                  onMouseLeave={() => setSsHoveredZone(null)}
                                />
                                {has && (
                                  <>
                                    <text
                                      x={getZoneLabelPosition(zone.id).x}
                                      y={getZoneLabelPosition(zone.id).y}
                                      textAnchor="middle"
                                      fill="white"
                                      fontSize="4"
                                      fontWeight="bold"
                                      style={{
                                        textShadow: "0 0 3px rgba(0,0,0,0.8)",
                                      }}
                                    >
                                      {stats.made}-{stats.attempts}
                                    </text>
                                    <text
                                      x={getZoneLabelPosition(zone.id).x}
                                      y={getZoneLabelPosition(zone.id).y + 5}
                                      textAnchor="middle"
                                      fill="white"
                                      fontSize="3.5"
                                      fontWeight="bold"
                                      style={{
                                        textShadow: "0 0 3px rgba(0,0,0,0.8)",
                                      }}
                                    >
                                      {pct}%
                                    </text>
                                  </>
                                )}
                              </g>
                            );
                          })}
                        </svg>
                        {!ssActive && ssShots.length === 0 && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <div className="text-center text-white px-4">
                              <Target className="w-10 h-10 mx-auto mb-2 opacity-80" />
                              <p className="font-semibold">Start a session</p>
                              <p className="text-sm opacity-80">
                                Tap zones, then record makes/misses
                              </p>
                            </div>
                          </div>
                        )}
                        {ssSelectedZone && ssActive && (
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
                            {COURT_ZONES.find((z) => z.id === ssSelectedZone)
                              ?.name || ssSelectedZone}
                          </div>
                        )}
                      </div>
                      {ssSelectedZone && ssActive && (
                        <div className="flex justify-center gap-3 mt-4">
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white px-6"
                            onClick={() => ssRecordShot(true)}
                          >
                            Made
                          </Button>
                          <Button
                            className="bg-red-600 hover:bg-red-700 text-white px-6"
                            onClick={() => ssRecordShot(false)}
                          >
                            Miss
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-white text-base">
                        Session stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 text-white">
                      <div className="rounded-lg bg-white/5 p-3 border border-border text-center">
                        <div className="text-2xl font-bold">{ssShots.length}</div>
                        <div className="text-xs text-muted-foreground">Shots</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3 border border-border text-center">
                        <div className="text-2xl font-bold">{ssMade}</div>
                        <div className="text-xs text-muted-foreground">Made</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3 border border-border text-center">
                        <div className="text-2xl font-bold">{ssPct}%</div>
                        <div className="text-xs text-muted-foreground">FG%</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3 border border-border text-center">
                        <div className="text-2xl font-bold font-mono">
                          {formatSessionTime(ssTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">Time</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border bg-card">
                    <CardHeader>
                      <CardTitle className="text-white text-base">
                        Controls
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {!ssActive && ssShots.length === 0 && (
                        <Button
                          className={`w-full ${primaryBtn}`}
                          style={primaryStyle}
                          onClick={ssStart}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start
                        </Button>
                      )}
                      {ssActive && (
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => setSsActive(false)}
                        >
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </Button>
                      )}
                      {!ssActive && ssShots.length > 0 && (
                        <Button
                          className={`w-full ${primaryBtn}`}
                          style={primaryStyle}
                          onClick={() => setSsActive(true)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Resume
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        className="w-full"
                        disabled={!ssShots.length && !ssActive}
                        onClick={ssEnd}
                      >
                        <Square className="w-4 h-4 mr-2" />
                        End & save
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
