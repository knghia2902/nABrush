import type { SceneSnapshot, StrokeSceneItem } from "../../src/types/overlay";
import {
  ensureGeneratedOverlayInteractionTarget,
  invokeNativeCommand,
  selectVisibleGeneratedOverlay,
  switchToBootstrapOverlay,
  waitForWdioBridgeReady,
} from "../../wdio.conf";

type Point = { x: number; y: number };

async function invoke<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  return invokeNativeCommand<T>(command, args);
}

async function dispatch(action: "Show" | "Esc") {
  return invoke<string>("test_dispatch_action", { action });
}

async function waitForMode(expected: string) {
  await browser.waitUntil(async () => await browser.execute(
    () => document.querySelector("main")?.getAttribute("data-mode") ?? "",
  ) === expected, {
    timeout: 15_000,
    timeoutMsg: `[${hostLabel()}] Expected overlay mode ${expected}`,
  });
}

function hostLabel() {
  const host = process.platform === "darwin" ? "macOS" : process.platform === "win32" ? "Windows" : process.platform;
  return `${host}/${String(browser.capabilities?.browserName ?? "embedded-tauri")}`;
}

async function nativeSnapshot(): Promise<SceneSnapshot> {
  const snapshot = await invoke<SceneSnapshot>("get_scene_snapshot");
  if (!snapshot || !Array.isArray(snapshot.items)) throw new Error(`[${hostLabel()}] Native scene snapshot is invalid`);
  return snapshot;
}

async function canvasPoint(x: number, y: number): Promise<Point> {
  return browser.execute(([relativeX, relativeY]) => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]');
    if (!canvas) throw new Error("Overlay canvas is unavailable");
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(rect.left + rect.width * relativeX),
      y: Math.round(rect.top + rect.height * relativeY),
    };
  }, [x, y]);
}

async function pixelAlpha(point: Point): Promise<number> {
  return browser.execute(([x, y]) => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]');
    if (!canvas) throw new Error("Overlay canvas is unavailable");
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext("2d");
    if (!context || rect.width <= 0 || rect.height <= 0) throw new Error("Overlay canvas context is unavailable");
    const px = Math.max(0, Math.min(canvas.width - 1, Math.round((x - rect.left) * canvas.width / rect.width)));
    const py = Math.max(0, Math.min(canvas.height - 1, Math.round((y - rect.top) * canvas.height / rect.height)));
    return context.getImageData(px, py, 1, 1).data[3];
  }, [point.x, point.y]);
}

async function drawPen(start: Point, end: Point, expectedCount: number) {
  await ensureGeneratedOverlayInteractionTarget("lifecycle pen tracer");
  await browser.performActions([{
    type: "pointer",
    id: "phase4-lifecycle-pen",
    parameters: { pointerType: "mouse" },
    actions: [
      { type: "pointerMove", duration: 0, x: start.x, y: start.y },
      { type: "pointerDown", button: 0 },
      { type: "pointerMove", duration: 250, x: end.x, y: end.y },
      { type: "pointerUp", button: 0 },
    ],
  }]);
  await browser.waitUntil(async () => (await nativeSnapshot()).items.length === expectedCount + 1, {
    timeout: 15_000,
    timeoutMsg: `[${hostLabel()}] Real pen pointer gesture did not commit one shared native scene item`,
  });
  await browser.releaseActions();
}

async function setVanishingDuration(seconds: number) {
  const preset = await browser.$('[data-lifecycle-preset="true"]');
  await preset.waitForDisplayed();
  await browser.execute((value) => {
    const select = document.querySelector<HTMLSelectElement>('[data-lifecycle-preset="true"]');
    const setter = select && Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    if (!select || !setter || !Array.from(select.options).some((option) => option.value === value)) {
      throw new Error(`Vanishing duration preset ${value} is unavailable`);
    }
    setter.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }, String(seconds));
  const current = await browser.execute(() => ({
    preset: document.querySelector<HTMLSelectElement>('[data-lifecycle-preset="true"]')?.value ?? "",
    duration: document.querySelector<HTMLInputElement>('[data-lifecycle-duration="true"]')?.value ?? "",
    lifecycleMode: document.querySelector<HTMLElement>('[data-lifecycle-toggle="true"]')?.getAttribute("data-lifecycle-mode") ?? null,
    controlsMounted: document.querySelector('[data-lifecycle-controls="true"]') !== null,
    windowLabel: document.querySelector("main")?.getAttribute("data-window-label") ?? null,
    mode: document.querySelector("main")?.getAttribute("data-mode") ?? null,
  }));
  if (Number(current.preset) !== seconds || Number(current.duration) !== seconds) {
    throw new Error(`[${hostLabel()}] Vanishing duration did not retain ${seconds} seconds (ui=${JSON.stringify(current)})`);
  }
}

describe("Phase 4 editing and ink lifecycle", () => {
  before(async () => {
    await switchToBootstrapOverlay("phase4 bootstrap");
    expect(await dispatch("Show")).toBe("VisibleInteractive");
    // Refresh WebDriver's window-handle snapshot after the native display
    // overlay is created; embedded sessions enumerate windows at creation.
    await browser.reloadSession();
    await waitForWdioBridgeReady("phase4 generated overlay session");
    await switchToBootstrapOverlay("phase4 generated overlay enumeration");
    const target = await selectVisibleGeneratedOverlay("phase4 Show");
    await invoke("plugin:window|set_focus", { label: target.selectedLabel });
    await browser.execute(() => window.focus());
    await waitForMode("VisibleInteractive");
    expect(target.selectedLabel).toMatch(/^overlay-display-/);
    await expect(await browser.$('[data-overlay-canvas="true"]')).toBeDisplayed();
  });

  after(async () => {
    try { await browser.releaseActions(); } catch { /* preserve the lifecycle assertion */ }
    try {
      await dispatch("Show");
      await dispatch("Esc");
    } catch { /* the app may already be hidden after a failing assertion */ }
  });

  it("commits one vanishing pen item, fades it, and expires it while hidden without resurrection", async () => {
    const lifecycleToggle = await browser.$('[data-lifecycle-toggle="true"]');
    await browser.waitUntil(async () => await lifecycleToggle.isExisting(), {
      timeout: 10_000,
      timeoutMsg: `[${hostLabel()}] Lifecycle control did not mount: ${JSON.stringify(await browser.execute(() => ({
        main: (() => {
          const element = document.querySelector("main");
          return element ? {
            windowLabel: element.getAttribute("data-window-label"),
            mode: element.getAttribute("data-mode"),
            surface: element.getAttribute("data-overlay-surface"),
          } : null;
        })(),
        toolbarMounted: document.querySelector('[data-annotation-toolbar="true"]') !== null,
        lifecycleControlMounted: document.querySelector('[data-lifecycle-toggle="true"]') !== null,
      })))}`,
    });
    if (await lifecycleToggle.getAttribute("data-lifecycle-mode") !== "vanishing") await lifecycleToggle.click();
    await browser.waitUntil(async () => await lifecycleToggle.getAttribute("data-lifecycle-mode") === "vanishing", {
      timeout: 10_000,
      timeoutMsg: `[${hostLabel()}] Could not select Vanishing lifecycle mode`,
    });
    await setVanishingDuration(3);

    const before = await nativeSnapshot();
    const start = await canvasPoint(0.24, 0.32);
    const end = await canvasPoint(0.66, 0.4);
    const middle = { x: Math.round((start.x + end.x) / 2), y: Math.round((start.y + end.y) / 2) };
    await drawPen(start, end, before.items.length);

    const committed = await nativeSnapshot();
    expect(committed.sceneId).toBe(before.sceneId);
    expect(committed.items).toHaveLength(before.items.length + 1);
    const item = committed.items.at(-1);
    expect(item?.kind).toBe("stroke");
    if (!item || item.kind !== "stroke") throw new Error(`[${hostLabel()}] Native pen scene item was not a stroke`);
    const penItem = item as StrokeSceneItem;
    expect(penItem).toMatchObject({
      tool: "pen",
      style: { color: "#ef4444", opacity: 0.92, width: 2 },
      lifecycle: { mode: "vanishing", durationSeconds: 3 },
    });
    const committedAtMs = penItem.lifecycle?.committedAtMs;
    expect(committedAtMs).toEqual(expect.any(Number));
    if (typeof committedAtMs !== "number") throw new Error(`[${hostLabel()}] Native commit timestamp is missing`);
    await browser.waitUntil(async () => await browser.execute((expected) => {
      const main = document.querySelector("main");
      const ids = (main?.getAttribute("data-scene-ids") ?? "").split(",");
      const items = JSON.parse(main?.getAttribute("data-scene-lifecycles") ?? "[]") as Array<{
        id: string;
        lifecycle: { mode: string; durationSeconds?: number; committedAtMs?: number };
      }>;
      const rendered = items.find((candidate) => candidate.id === expected.id);
      return ids.includes(expected.id)
        && rendered?.lifecycle.mode === "vanishing"
        && rendered.lifecycle.durationSeconds === expected.durationSeconds
        && rendered.lifecycle.committedAtMs === expected.committedAtMs;
    }, { id: penItem.id, durationSeconds: 3, committedAtMs }), {
      timeout: 10_000,
      timeoutMsg: `[${hostLabel()}] React overlay did not apply the returned shared snapshot`,
    });

    await setVanishingDuration(5);
    const afterControlChange = await nativeSnapshot();
    expect(afterControlChange.items.find((candidate) => candidate.id === penItem.id)?.lifecycle)
      .toMatchObject({ mode: "vanishing", durationSeconds: 3, committedAtMs });

    await browser.waitUntil(async () => Date.now() >= committedAtMs + 500, {
      timeout: 2_000,
      timeoutMsg: `[${hostLabel()}] Did not reach the persistent portion of the selected lifetime`,
    });
    const earlyAlpha = await pixelAlpha(middle);
    let fadingAlpha = earlyAlpha;
    try {
      await browser.waitUntil(async () => {
        if (Date.now() < committedAtMs + 2_000) return false;
        fadingAlpha = await pixelAlpha(middle);
        return fadingAlpha > 0 && fadingAlpha < earlyAlpha - 50;
      }, {
        timeout: 2_500,
        interval: 50,
        timeoutMsg: `[${hostLabel()}] Did not reach the final-second fade window`,
      });
    } catch (error) {
      const diagnostics = await browser.execute(() => ({
        canvasGesture: document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]')?.getAttribute("data-gesture-phase"),
        mode: document.querySelector("main")?.getAttribute("data-mode"),
        visibilityState: document.visibilityState,
        documentHasFocus: document.hasFocus(),
        sceneIds: document.querySelector("main")?.getAttribute("data-scene-ids"),
        sceneLifecycles: document.querySelector("main")?.getAttribute("data-scene-lifecycles"),
      }));
      throw new Error(`[${hostLabel()}] Final-second fade probe alpha=${fadingAlpha}, renderer=${JSON.stringify(diagnostics)}: ${error instanceof Error ? error.message : String(error)}`);
    }
    expect(earlyAlpha).toBeGreaterThan(180);
    expect(fadingAlpha).toBeGreaterThan(0);
    expect(fadingAlpha).toBeLessThan(earlyAlpha - 50);
    await browser.waitUntil(async () => (await nativeSnapshot()).items.every((candidate) => candidate.id !== penItem.id), {
      timeout: 2_000,
      timeoutMsg: `[${hostLabel()}] Vanishing pen mark was not removed at its native deadline`,
    });

    await setVanishingDuration(3);
    const secondBefore = await nativeSnapshot();
    await drawPen(await canvasPoint(0.3, 0.58), await canvasPoint(0.64, 0.66), secondBefore.items.length);
    const hiddenCommit = await nativeSnapshot();
    const hiddenCandidate = hiddenCommit.items.at(-1);
    if (!hiddenCandidate || hiddenCandidate.kind !== "stroke") throw new Error(`[${hostLabel()}] Second native pen scene item was not committed`);
    const hiddenId = hiddenCandidate.id;
    const hiddenCommitAt = hiddenCandidate.lifecycle?.committedAtMs;
    expect(hiddenCandidate.lifecycle).toMatchObject({ mode: "vanishing", durationSeconds: 3 });
    expect(hiddenCommitAt).toEqual(expect.any(Number));

    await dispatch("Esc");
    await waitForMode("Hidden");
    await browser.waitUntil(async () => Date.now() >= Number(hiddenCommitAt) + 3_200, {
      timeout: 5_000,
      timeoutMsg: `[${hostLabel()}] Hidden overlay did not remain hidden through the annotation deadline`,
    });
    await dispatch("Show");
    await waitForMode("VisibleInteractive");
    await selectVisibleGeneratedOverlay("reopen after hidden expiry");
    await browser.waitUntil(async () => (await nativeSnapshot()).items.every((candidate) => candidate.id !== hiddenId), {
      timeout: 2_000,
      timeoutMsg: `[${hostLabel()}] Expired hidden ink remained in the canonical scene`,
    });
    await browser.pause(250);
    expect((await nativeSnapshot()).items.some((candidate) => candidate.id === hiddenId)).toBe(false);
    expect(await browser.execute(() => document.querySelector("main")?.getAttribute("data-scene-ids")))
      .not.toContain(hiddenId);
  });
});
