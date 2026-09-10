import { TOOL_ORDER } from "../../src/types/platform-parity";

type Point = { x: number; y: number };

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return browser.execute(async (name, payload) => {
    const invoke = (window as unknown as { __TAURI_INTERNALS__?: { invoke?: Function } }).__TAURI_INTERNALS__?.invoke;
    if (!invoke) throw new Error("Tauri invoke bridge is unavailable");
    return invoke(name, payload);
  }, command, args ?? {}) as Promise<T>;
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

async function pointerMove(point: Point) {
  await browser.performActions([{
    type: "pointer",
    id: "phase3-mouse",
    parameters: { pointerType: "mouse" },
    actions: [{ type: "pointerMove", duration: 0, x: point.x, y: point.y }],
  }]);
}

async function pointerDown(point: Point) {
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
  const canvas = await browser.$('[data-overlay-canvas="true"]');
  await browser.execute((expected) => {
    const key = "__phase3SceneCounts";
    const target = window as unknown as Record<string, unknown>;
    target[key] = [];
    target.__phase3SceneCountsTimer = window.setInterval(() => {
      const main = document.querySelector("main");
      (target[key] as number[]).push(Number(main?.getAttribute("data-scene-count") ?? "0"));
    }, 10);
    void expected;
  }, expectedCount);
  await canvas.dragAndDrop({ x: end.x, y: end.y }, { duration: 250 });
  const counts = await browser.execute(() => {
    const target = window as unknown as Record<string, unknown>;
    window.clearInterval(target.__phase3SceneCountsTimer as number);
    return (target.__phase3SceneCounts as number[]) ?? [];
  });
  expect(counts.length).toBeGreaterThan(0);
  expect(counts.every((count) => count === expectedCount)).toBe(true);
  await browser.waitUntil(async () => (await sceneSnapshot()).count === expectedCount + 1, {
    timeout: 15_000,
    timeoutMsg: "Pointer-up did not commit exactly one retained scene item",
  });
}

async function selectTool(tool: (typeof TOOL_ORDER)[number]) {
  const button = await browser.$(`[data-tool="${tool}"]`);
  await button.click();
  await expect(button).toHaveAttribute("aria-pressed", "true");
}

describe("Phase 3 core annotation tools", () => {
  before(async () => {
    await browser.tauri.switchWindow("overlay");
    await dispatch("Show");
    await waitForMode("VisibleInteractive");
    await expect(await browser.$('[data-overlay-canvas="true"]')).toBeDisplayed();
    await expect(await browser.$('[data-display-id]')).toExist();
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

  it("commits six realtime drawing tools, text keyboard lifecycle, and one topmost erase", async () => {
    const baseline = await sceneSnapshot();
    expect(baseline.id).toBe("webview-scene");
    expect(baseline.ids).toHaveLength(baseline.count);

    const gestures: Array<{ tool: (typeof TOOL_ORDER)[number]; start: Point; end: Point }> = [
      { tool: "pen", start: await canvasPoint(0.12, 0.16), end: await canvasPoint(0.22, 0.2) },
      { tool: "highlighter", start: await canvasPoint(0.3, 0.16), end: await canvasPoint(0.4, 0.2) },
      { tool: "line", start: await canvasPoint(0.48, 0.16), end: await canvasPoint(0.58, 0.2) },
      { tool: "arrow", start: await canvasPoint(0.66, 0.16), end: await canvasPoint(0.76, 0.2) },
      { tool: "rectangle", start: await canvasPoint(0.12, 0.38), end: await canvasPoint(0.24, 0.5) },
      { tool: "ellipse", start: await canvasPoint(0.34, 0.38), end: await canvasPoint(0.46, 0.5) },
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

    const textAnchor = await canvasPoint(0.58, 0.38);
    await selectTool("text");
    await clickCanvas(textAnchor);
    const editor = await browser.$('[data-text-draft="true"]');
    await editor.waitForDisplayed();
    await expect(editor).toHaveAttribute("data-scene-excluded", "true");
    await editor.addValue("first line");
    await editor.keys(["Shift", "Enter"]);
    await editor.addValue("second line");
    await expect(editor).toHaveValue("first line\nsecond line");
    const beforeTextCommit = await sceneSnapshot();
    await editor.keys("Enter");
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
    await browser.$('[data-text-draft="true"]').keys("Escape");
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

  it("keeps toolbar and canvas excluded from click-through input", async () => {
    await selectTool("pen");
    await browser.$('[aria-label="Tool properties"]').click();
    await expect(await browser.$('[data-property-popover="true"]')).toHaveAttribute("data-scene-excluded", "true");
    await browser.$('[aria-label="Tool properties"]').click();

    const sceneBeforeMode = await sceneSnapshot();
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
    await expect(await browser.execute(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]');
      return canvas ? getComputedStyle(canvas).pointerEvents : "missing";
    })).toBe("auto");
  });
});
