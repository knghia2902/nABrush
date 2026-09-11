import { TOOL_ORDER } from "../../src/types/platform-parity";
import type { SceneSnapshot } from "../../src/types/overlay";
import {
  ensureGeneratedOverlayInteractionTarget,
  invokeNativeCommand,
  selectVisibleGeneratedOverlay,
  switchToBootstrapOverlay,
} from "../../wdio.conf";

type Point = { x: number; y: number };
type CanvasGestureState = { phase: string; transient: string };

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return invokeNativeCommand<T>(command, args ?? {});
}

async function dispatch(action: "Show" | "Esc" | "ToggleClickThrough") {
  return invoke<string>("test_dispatch_action", { action });
}

async function mode() {
  return browser.execute(() => document.querySelector("main")?.getAttribute("data-mode"));
}

async function waitForMode(expected: string) {
  await browser.waitUntil(async () => (await mode()) === expected, {
    timeout: 15_000,
    timeoutMsg: `Expected overlay mode ${expected}`,
  });
}

async function sceneSnapshot() {
  return browser.execute(() => {
    const main = document.querySelector("main");
    return {
      id: main?.getAttribute("data-scene-id") ?? "",
      count: Number(main?.getAttribute("data-scene-count") ?? "0"),
      ids: (main?.getAttribute("data-scene-ids") ?? "").split(",").filter(Boolean),
    };
  });
}

async function nativeSceneSnapshot() {
  const snapshot = await invoke<SceneSnapshot>("get_scene_snapshot");
  if (!snapshot || !Array.isArray(snapshot.items)) throw new Error(`[${hostLabel()}] Native scene snapshot is invalid`);
  return snapshot;
}

function hostLabel() {
  const host = process.platform === "darwin" ? "macOS" : process.platform === "win32" ? "Windows" : process.platform;
  return `${host}/${String(browser.capabilities?.browserName ?? "embedded-tauri")}`;
}

async function canvasRect() {
  return browser.execute(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]');
    if (!canvas) throw new Error("Overlay canvas is unavailable");
    const rect = canvas.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  });
}

async function canvasPoint(x: number, y: number): Promise<Point> {
  const rect = await canvasRect();
  return {
    x: Math.round(rect.left + rect.width * x),
    y: Math.round(rect.top + rect.height * y),
  };
}

async function canvasGestureState(): Promise<CanvasGestureState> {
  return browser.execute(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]');
    if (!canvas) throw new Error("Overlay canvas is unavailable");
    return {
      phase: canvas.getAttribute("data-gesture-phase") ?? "missing",
      transient: canvas.getAttribute("data-transient-active") ?? "missing",
    };
  });
}

async function installInputDiagnostics() {
  await browser.execute(() => {
    const scope = window as typeof window & {
      __phase3InputEvents?: string[];
      __phase3InputCleanup?: () => void;
    };
    scope.__phase3InputCleanup?.();
    const events: string[] = [];
    const listener = (event: Event) => {
      const input = event as MouseEvent;
      const target = event.target as HTMLElement | null;
      events.push(`${event.type}:${target?.tagName ?? "?"}:${target?.getAttribute("data-toolbar-drag-handle") ?? ""}:${input.clientX},${input.clientY}`);
    };
    for (const type of ["mousedown", "mousemove", "mouseup", "pointerdown", "pointermove", "pointerup"]) {
      window.addEventListener(type, listener, true);
    }
    scope.__phase3InputEvents = events;
    scope.__phase3InputCleanup = () => {
      for (const type of ["mousedown", "mousemove", "mouseup", "pointerdown", "pointermove", "pointerup"]) {
        window.removeEventListener(type, listener, true);
      }
    };
  });
}

async function inputDiagnostics(point: Point) {
  return browser.execute((at) => {
    const scope = window as typeof window & { __phase3InputEvents?: string[] };
    const target = document.elementFromPoint(at.x, at.y) as HTMLElement | null;
    return {
      at,
      element: target ? `${target.tagName}.${target.className}` : null,
      toolbarHandle: Boolean(target?.closest('[data-toolbar-drag-handle="true"]')),
      events: scope.__phase3InputEvents ?? [],
      phase: document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]')?.getAttribute("data-gesture-phase"),
      transient: document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]')?.getAttribute("data-transient-active"),
    };
  }, point);
}

async function toolbarRect() {
  return browser.execute(() => {
    const toolbar = document.querySelector<HTMLElement>('[data-annotation-toolbar="true"]');
    if (!toolbar) throw new Error("Annotation toolbar is unavailable");
    const rect = toolbar.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
}

async function pointerMove(point: Point) {
  await ensureGeneratedOverlayInteractionTarget("pointer move");
  await browser.performActions([{
    type: "pointer",
    id: "phase3-mouse",
    parameters: { pointerType: "mouse" },
    actions: [{ type: "pointerMove", duration: 0, x: point.x, y: point.y }],
  }]);
}

async function pointerDown(point: Point) {
  await ensureGeneratedOverlayInteractionTarget("pointer down");
  await browser.performActions([{
    type: "pointer",
    id: "phase3-mouse",
    parameters: { pointerType: "mouse" },
    actions: [
      { type: "pointerMove", duration: 0, x: point.x, y: point.y },
      { type: "pointerDown", button: 0 },
    ],
  }]);
}

async function pointerUp(point: Point) {
  await ensureGeneratedOverlayInteractionTarget("pointer up");
  await browser.performActions([{
    type: "pointer",
    id: "phase3-mouse",
    parameters: { pointerType: "mouse" },
    actions: [
      { type: "pointerMove", duration: 0, x: point.x, y: point.y },
      { type: "pointerUp", button: 0 },
    ],
  }]);
}

async function clickCanvas(point: Point) {
  await pointerDown(point);
  await pointerUp(point);
}

async function dragCanvas(start: Point, end: Point, expectedCount: number) {
  await ensureGeneratedOverlayInteractionTarget("canvas drag");
  await installInputDiagnostics();
  const before = await sceneSnapshot();
  expect(before.count).toBe(expectedCount);
  try {
    await browser.performActions([{
      type: "pointer",
      id: "phase3-draw-pointer",
      parameters: { pointerType: "mouse" },
      actions: [
        { type: "pointerMove", duration: 0, x: start.x, y: start.y },
        { type: "pointerDown", button: 0 },
        { type: "pointerMove", duration: 250, x: end.x, y: end.y },
      ],
    }]);
    await browser.waitUntil(async () => {
      const state = await canvasGestureState();
      const snapshot = await sceneSnapshot();
      return state.phase === "previewing" && state.transient === "true" && snapshot.count === expectedCount;
    }, {
      timeout: 15_000,
      timeoutMsg: `[${hostLabel()}] Realtime preview was not visible before pointer-up`,
    });
    expect(await sceneSnapshot()).toEqual(before);
    expect(await canvasGestureState()).toEqual({ phase: "previewing", transient: "true" });

    await ensureGeneratedOverlayInteractionTarget("canvas drag pointer up");
    await browser.performActions([{
      type: "pointer",
      id: "phase3-draw-pointer",
      parameters: { pointerType: "mouse" },
      actions: [
        { type: "pointerMove", duration: 0, x: end.x, y: end.y },
        { type: "pointerUp", button: 0 },
      ],
    }]);
    await browser.waitUntil(async () => (await sceneSnapshot()).count === expectedCount + 1, {
      timeout: 15_000,
      timeoutMsg: `[${hostLabel()}] Pointer-up did not commit exactly one retained scene item`,
    });
    const after = await sceneSnapshot();
    const addedIds = after.ids.filter((id) => !before.ids.includes(id));
    expect(addedIds).toHaveLength(1);
    expect(after.count).toBe(expectedCount + 1);
    await browser.waitUntil(async () => (await canvasGestureState()).transient === "false", {
      timeout: 15_000,
      timeoutMsg: `[${hostLabel()}] Transient gesture did not reset after pointer-up`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const diagnostics = await inputDiagnostics(start);
    throw new Error(`[${hostLabel()}] Pointer path failed from ${JSON.stringify(start)} to ${JSON.stringify(end)}: ${message}; diagnostics=${JSON.stringify(diagnostics)}`);
  } finally {
    await browser.execute(() => (window as typeof window & { __phase3InputCleanup?: () => void }).__phase3InputCleanup?.());
    try {
      await browser.releaseActions();
    } catch {
      // Cleanup must not mask the lifecycle assertion that failed above.
    }
  }
}

async function openPropertiesFor(tool: (typeof TOOL_ORDER)[number]) {
  await ensureGeneratedOverlayInteractionTarget(`open properties ${tool}`);
  const properties = await browser.$('[aria-label="Tool properties"]');
  await expect(await browser.$(`[data-tool="${tool}"]`)).toHaveAttribute("aria-pressed", "true");
  if (await properties.getAttribute("aria-expanded") !== "true") await properties.click();
  await browser.waitUntil(async () => (await browser.$('[data-property-popover="true"]')).getAttribute("data-active-tool") === tool, {
    timeout: 15_000,
    timeoutMsg: `[${hostLabel()}] Property popover did not select ${tool}`,
  });
}

async function closeProperties() {
  await ensureGeneratedOverlayInteractionTarget("close properties");
  const properties = await browser.$('[aria-label="Tool properties"]');
  if (await properties.getAttribute("aria-expanded") === "true") await properties.click();
}

async function setStyleControl(controlName: string, value: string) {
  await ensureGeneratedOverlayInteractionTarget(`set style ${controlName}`);
  const control = await browser.$(`[data-style-control="${controlName}"]`);
  await control.waitForDisplayed();
  await control.setValue(value);
  await browser.waitUntil(async () => String(await control.getValue()) === value, {
    timeout: 15_000,
    timeoutMsg: `[${hostLabel()}] ${controlName} did not retain ${value}`,
  });
}

async function selectTool(tool: (typeof TOOL_ORDER)[number]) {
  await ensureGeneratedOverlayInteractionTarget(`select ${tool}`);
  const button = await browser.$(`[data-tool="${tool}"]`);
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

describe("Phase 3 core annotation tools", () => {
  before(async () => {
    await switchToBootstrapOverlay("phase3 bootstrap");
    await dispatch("Show");
    await waitForMode("VisibleInteractive");
    const target = await selectVisibleGeneratedOverlay("phase3 Show");
    expect(target.selectedLabel).toMatch(/^overlay-display-/);
    await expect(await browser.$('[data-overlay-canvas="true"]')).toBeDisplayed();
    expect(await browser.execute(() => document.querySelector("main")?.getAttribute("data-window-label"))).toMatch(/^overlay-display-/);
  });

  after(async () => {
    await browser.releaseActions();
    await dispatch("Esc");
    await waitForMode("Hidden");
  });

  it("selects every tool in the shared order and retains per-tool properties", async () => {
    const actualOrder = await browser.execute(() => Array.from(
      document.querySelectorAll<HTMLElement>('[data-annotation-toolbar="true"] [data-tool]'),
      (button) => button.getAttribute("data-tool"),
    ));
    expect(actualOrder).toEqual([...TOOL_ORDER]);
    await expect(await browser.$('[data-annotation-toolbar="true"]')).toHaveAttribute("data-scene-excluded", "true");

    await selectTool("pen");
    await browser.$('[aria-label="Tool properties"]').click();
    const penPopover = await browser.$('[data-property-popover="true"]');
    await expect(penPopover).toHaveAttribute("data-active-tool", "pen");
    const penOpacity = await browser.$('[data-style-control="opacity"]');
    const penOpacityValue = await penOpacity.getValue();
    expect(penOpacityValue).toBeTruthy();

    for (const tool of TOOL_ORDER) {
      await selectTool(tool);
      await expect(await browser.$('[data-property-popover="true"]')).toHaveAttribute("data-active-tool", tool);
    }
    await selectTool("pen");
    await expect(await browser.$('[data-style-control="opacity"]')).toHaveValue(penOpacityValue);
    await browser.$('[aria-label="Tool properties"]').click();
  });

  it("places, edits, and commits a text draft through the native overlay", async () => {
    const before = await sceneSnapshot();
    const anchor = await canvasPoint(0.58, 0.3);
    await selectTool("text");
    await installInputDiagnostics();
    try {
      await clickCanvas(anchor);
      const editor = await browser.$('[data-text-draft="true"]');
      await editor.waitForDisplayed({ timeout: 5_000 });
      await expect(editor).toBeFocused();
      await editor.addValue("native text");
      await expect(editor).toHaveValue("native text");
      await browser.keys(["Shift", "Enter"]);
      await editor.addValue("second line");
      await expect(editor).toHaveValue("native text\nsecond line");
      await browser.keys("Enter");
      await browser.waitUntil(async () => (await sceneSnapshot()).count === before.count + 1, {
        timeout: 15_000,
        timeoutMsg: "Native Enter did not commit the text draft",
      });
      const after = await sceneSnapshot();
      const native = await nativeSceneSnapshot();
      const item = native.items.find((candidate) => candidate.id === after.ids.at(-1));
      expect(item).toMatchObject({ kind: "text", tool: "text", text: "native text\nsecond line" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${message}; text diagnostics=${JSON.stringify(await inputDiagnostics(anchor))}`);
    } finally {
      await browser.execute(() => (window as typeof window & { __phase3InputCleanup?: () => void }).__phase3InputCleanup?.());
      await browser.releaseActions();
    }
  });

  it("commits realtime drawing tools, distinct shape styles, text lifecycle, and one topmost erase", async () => {
    const baseline = await sceneSnapshot();
    expect(baseline.id).toBe("webview-scene");
    expect(baseline.ids).toHaveLength(baseline.count);

    const gestures: Array<{ tool: "pen" | "highlighter" | "line" | "arrow"; start: Point; end: Point }> = [
      { tool: "pen", start: await canvasPoint(0.12, 0.16), end: await canvasPoint(0.22, 0.2) },
      { tool: "highlighter", start: await canvasPoint(0.3, 0.16), end: await canvasPoint(0.4, 0.2) },
      { tool: "line", start: await canvasPoint(0.48, 0.16), end: await canvasPoint(0.58, 0.2) },
      { tool: "arrow", start: await canvasPoint(0.66, 0.16), end: await canvasPoint(0.76, 0.2) },
    ];

    let expectedCount = baseline.count;
    for (const gesture of gestures) {
      await selectTool(gesture.tool);
      await dragCanvas(gesture.start, gesture.end, expectedCount);
      expectedCount += 1;
      const snapshot = await sceneSnapshot();
      expect(snapshot.id).toBe(baseline.id);
      expect(snapshot.ids).toHaveLength(expectedCount);
    }

    await selectTool("rectangle");
    await openPropertiesFor("rectangle");
    await setStyleControl("fill", "solid");
    await setStyleControl("fillColor", "#16a34a");
    await setStyleControl("fillOpacity", "0.42");
    const rectangleStart = await canvasPoint(0.12, 0.38);
    const rectangleEnd = await canvasPoint(0.24, 0.5);
    await dragCanvas(rectangleStart, rectangleEnd, expectedCount);
    expectedCount += 1;
    const rectangleView = await sceneSnapshot();
    const rectangleNative = await nativeSceneSnapshot();
    expect(rectangleNative.sceneId).toBe(baseline.id);
    const rectangleItem = rectangleNative.items.find((item) => item.id === rectangleView.ids.at(-1));
    expect(rectangleItem).toMatchObject({
      tool: "rectangle",
      style: { fill: "solid", fillColor: "#16a34a", fillOpacity: 0.42 },
    });

    await selectTool("ellipse");
    await openPropertiesFor("ellipse");
    await setStyleControl("fill", "solid");
    await setStyleControl("fillColor", "#7c3aed");
    await setStyleControl("fillOpacity", "0.67");
    const ellipseStart = await canvasPoint(0.34, 0.38);
    const ellipseEnd = await canvasPoint(0.46, 0.5);
    await dragCanvas(ellipseStart, ellipseEnd, expectedCount);
    expectedCount += 1;
    const ellipseView = await sceneSnapshot();
    const ellipseNative = await nativeSceneSnapshot();
    const ellipseItem = ellipseNative.items.find((item) => item.id === ellipseView.ids.at(-1));
    expect(ellipseItem).toMatchObject({
      tool: "ellipse",
      style: { fill: "solid", fillColor: "#7c3aed", fillOpacity: 0.67 },
    });
    expect(ellipseItem?.style.fillColor).not.toBe(rectangleItem?.style.fillColor);
    expect(ellipseItem?.style.fillOpacity).not.toBe(rectangleItem?.style.fillOpacity);
    await closeProperties();

    const textAnchor = await canvasPoint(0.58, 0.38);
    await selectTool("text");
    await clickCanvas(textAnchor);
    const editor = await browser.$('[data-text-draft="true"]');
    await editor.waitForDisplayed();
    await expect(editor).toHaveAttribute("data-scene-excluded", "true");
    await ensureGeneratedOverlayInteractionTarget("text draft input");
    await editor.addValue("first line");
    await ensureGeneratedOverlayInteractionTarget("text draft newline");
    await browser.keys(["Shift", "Enter"]);
    await editor.addValue("second line");
    await expect(editor).toHaveValue("first line\nsecond line");
    const beforeTextCommit = await sceneSnapshot();
    await ensureGeneratedOverlayInteractionTarget("text draft commit");
    await browser.keys("Enter");
    await browser.waitUntil(async () => (await sceneSnapshot()).count === beforeTextCommit.count + 1, {
      timeout: 15_000,
      timeoutMsg: "Enter did not commit the text draft",
    });
    expectedCount += 1;
    const afterTextCommit = await sceneSnapshot();
    expect(afterTextCommit.id).toBe(baseline.id);
    expect(afterTextCommit.ids).toHaveLength(expectedCount);

    await clickCanvas(await canvasPoint(0.58, 0.62));
    const beforeCancel = await sceneSnapshot();
    await expect(await browser.$('[data-text-draft="true"]')).toBeDisplayed();
    await ensureGeneratedOverlayInteractionTarget("text draft cancel");
    await browser.keys("Escape");
    await browser.waitUntil(async () => !(await browser.$('[data-text-draft="true"]').isExisting()), {
      timeout: 15_000,
      timeoutMsg: "Escape did not cancel the text draft",
    });
    expect(await sceneSnapshot()).toEqual(beforeCancel);

    await selectTool("eraser");
    const beforeErase = await sceneSnapshot();
    await pointerMove(textAnchor);
    await browser.pause(100);
    expect(await sceneSnapshot()).toEqual(beforeErase);
    await clickCanvas(textAnchor);
    await browser.waitUntil(async () => (await sceneSnapshot()).count === beforeErase.count - 1, {
      timeout: 15_000,
      timeoutMsg: "Eraser did not remove exactly one topmost target",
    });
    const afterErase = await sceneSnapshot();
    expect(afterErase.id).toBe(baseline.id);
    expect(afterErase.ids).toHaveLength(beforeErase.count - 1);
  });

  it("moves the scene-excluded toolbar without leaking into the retained scene", async () => {
    await selectTool("pen");
    const beforeScene = await sceneSnapshot();
    const beforeToolbar = await toolbarRect();
    const start = {
      x: Math.round(beforeToolbar.left + beforeToolbar.width / 2),
      y: Math.round(beforeToolbar.top + 18),
    };
    const end = {
      x: Math.round(Math.min(beforeToolbar.viewportWidth - beforeToolbar.width - 20, beforeToolbar.left + 180)),
      y: Math.round(Math.min(beforeToolbar.viewportHeight - beforeToolbar.height - 20, beforeToolbar.top + 80)),
    };

    await expect(await browser.$('[data-toolbar-drag-handle="true"]')).toHaveAttribute("data-scene-excluded", "true");
    try {
      await ensureGeneratedOverlayInteractionTarget("toolbar drag");
      await installInputDiagnostics();
      await browser.performActions([{
        type: "pointer",
        id: "phase3-toolbar-pointer",
        parameters: { pointerType: "mouse" },
        actions: [
          { type: "pointerMove", duration: 0, x: start.x, y: start.y },
          { type: "pointerDown", button: 0 },
          { type: "pointerMove", duration: 250, x: end.x, y: end.y },
          { type: "pointerUp", button: 0 },
        ],
      }]);
      await browser.waitUntil(async () => {
        const current = await toolbarRect();
        return current.left !== beforeToolbar.left || current.top !== beforeToolbar.top;
      }, {
        timeout: 15_000,
        timeoutMsg: `[${hostLabel()}] Toolbar drag did not move the palette`,
      });
    } finally {
      const diagnostics = await inputDiagnostics(start);
      console.log(`[${hostLabel()}] Toolbar input diagnostics ${JSON.stringify(diagnostics)}`);
      await browser.execute(() => (window as typeof window & { __phase3InputCleanup?: () => void }).__phase3InputCleanup?.());
      await browser.releaseActions();
    }

    const afterToolbar = await toolbarRect();
    const afterScene = await sceneSnapshot();
    expect(afterToolbar.left).toBeGreaterThanOrEqual(0);
    expect(afterToolbar.top).toBeGreaterThanOrEqual(0);
    expect(afterToolbar.left + afterToolbar.width).toBeLessThanOrEqual(afterToolbar.viewportWidth + 1);
    expect(afterToolbar.top + afterToolbar.height).toBeLessThanOrEqual(afterToolbar.viewportHeight + 1);
    expect(afterScene).toEqual(beforeScene);
    expect(await canvasGestureState()).toEqual({ phase: "idle", transient: "false" });

    await selectTool("pen");
    await dragCanvas(await canvasPoint(0.7, 0.72), await canvasPoint(0.82, 0.78), beforeScene.count);
  });

  it("keeps toolbar and canvas excluded from click-through input", async () => {
    await selectTool("pen");
    await browser.$('[aria-label="Tool properties"]').click();
    await expect(await browser.$('[data-property-popover="true"]')).toHaveAttribute("data-scene-excluded", "true");
    await browser.$('[aria-label="Tool properties"]').click();

    const sceneBeforeMode = await sceneSnapshot();
    const toolbarBeforeMode = await toolbarRect();
    await dispatch("ToggleClickThrough");
    await waitForMode("VisibleClickThrough");
    await expect(await browser.$('[data-annotation-toolbar="true"]')).not.toExist();
    await expect(await browser.$('[data-property-popover="true"]')).not.toExist();
    await expect(await browser.execute(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]');
      return canvas ? getComputedStyle(canvas).pointerEvents : "missing";
    })).toBe("none");
    expect(await sceneSnapshot()).toEqual(sceneBeforeMode);

    await dispatch("ToggleClickThrough");
    await waitForMode("VisibleInteractive");
    await expect(await browser.$('[data-annotation-toolbar="true"]')).toBeDisplayed();
    const toolbarAfterMode = await toolbarRect();
    expect(toolbarAfterMode.left).toBeCloseTo(toolbarBeforeMode.left, 0);
    expect(toolbarAfterMode.top).toBeCloseTo(toolbarBeforeMode.top, 0);
    await expect(await browser.execute(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]');
      return canvas ? getComputedStyle(canvas).pointerEvents : "missing";
    })).toBe("auto");
  });
});
