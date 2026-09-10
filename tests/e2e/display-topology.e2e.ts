import { loadPlatformParityContract } from "../../src/types/platform-parity";

type FixtureStage = "two" | "updated" | "removed" | "readded";

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

async function sceneState() {
  return browser.execute(() => {
    const main = document.querySelector("main");
    return {
      id: main?.getAttribute("data-scene-id") ?? "",
      count: Number(main?.getAttribute("data-scene-count") ?? "0"),
    };
  });
}

async function waitForMode(expected: string) {
  await browser.waitUntil(
    async () => (await browser.execute(() => document.querySelector("main")?.getAttribute("data-mode"))) === expected,
    { timeout: 15_000, timeoutMsg: `Expected overlay mode ${expected}` },
  );
}

async function topologyFixture(stage: FixtureStage) {
  return invoke<{
    stage: string;
    added: string[];
    removed: string[];
    updated: string[];
    viewportLabels: string[];
    sceneId: string;
  }>("test_reconcile_topology_fixture", { stage });
}

describe("Phase 2 display topology and parity", () => {
  before(async () => {
    await browser.tauri.switchWindow("overlay");
  });

  it("exposes one native viewport label per active descriptor and retains one scene", async () => {
    const initial = await topologyFixture("two");
    expect(initial.viewportLabels).toHaveLength(2);
    expect(new Set(initial.viewportLabels).size).toBe(2);
    expect(initial.sceneId).toBe("webview-scene");

    const updated = await topologyFixture("updated");
    expect(updated.added).toHaveLength(0);
    expect(updated.removed).toHaveLength(0);
    expect(updated.updated).toContain("fixture-left");
    expect(updated.viewportLabels).toHaveLength(2);
    expect(updated.sceneId).toBe(initial.sceneId);

    const removed = await topologyFixture("removed");
    expect(removed.removed).toEqual(expect.arrayContaining(["fixture-main", "fixture-left"]));
    expect(removed.viewportLabels).toHaveLength(0);
    expect(removed.sceneId).toBe(initial.sceneId);

    const readded = await topologyFixture("readded");
    expect(readded.added).toEqual(expect.arrayContaining(["fixture-main", "fixture-left"]));
    expect(readded.viewportLabels).toHaveLength(2);
    expect(readded.sceneId).toBe(initial.sceneId);
  });

  it("broadcasts mode and click-through state to the active viewport", async () => {
    await dispatch("Show");
    await waitForMode("VisibleInteractive");
    await expect(await browser.$('[data-overlay-canvas="true"]')).toBeDisplayed();
    await expect(await browser.$('[data-display-id]')).toExist();

    await dispatch("ToggleClickThrough");
    await waitForMode("VisibleClickThrough");
    await expect(await browser.execute(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-overlay-canvas="true"]');
      return canvas ? getComputedStyle(canvas).pointerEvents : "missing";
    })).toBe("none");

    await dispatch("Esc");
    await waitForMode("Hidden");
  });

  it("keeps shared scene identity through topology recovery and scoped errors", async () => {
    await dispatch("Show");
    await waitForMode("VisibleInteractive");
    const before = await sceneState();

    await topologyFixture("two");
    await topologyFixture("removed");
    await topologyFixture("readded");
    const afterTopology = await sceneState();
    expect(afterTopology.id).toBe(before.id);
    expect(afterTopology.count).toBe(before.count);

    await invoke("test_inject_overlay_error");
    await browser.waitUntil(
      async () => await browser.$('[data-error-code="OverlayInitialization"]').isDisplayed(),
      { timeout: 15_000, timeoutMsg: "Scoped overlay recovery error did not render" },
    );
    await expect(await browser.$('[data-error-code="OverlayInitialization"]')).toHaveAttribute("data-scene-excluded", "true");
    await browser.$('[data-error-code="OverlayInitialization"] button').click();
    await browser.waitUntil(
      async () => !(await browser.$('[data-error-code="OverlayInitialization"]').isExisting()),
      { timeout: 15_000, timeoutMsg: "Scoped overlay retry did not clear the error" },
    );
    expect(await sceneState()).toEqual(before);
    await dispatch("Esc");
  });

  it("returns the exact shortcut, tool-order, and export contract fixture", async () => {
    const nativeContract = await invoke("platform_parity_contract");
    expect(nativeContract).toEqual(loadPlatformParityContract());

    const contract = loadPlatformParityContract();
    expect(contract.shortcutConcepts).toEqual(["Show", "ToggleVisibility", "ToggleClickThrough", "Esc"]);
    expect(contract.toolOrder).toEqual(["pen", "highlighter", "line", "arrow", "rectangle", "ellipse", "text", "eraser"]);
    expect(contract.exportSemantics.compositionPasses).toBe(1);
    expect(contract.exportSemantics.pixelDensity).toBe("display");
    expect(contract.exportSemantics.excluded).toEqual(["toolbar", "mode-badge", "error-badge"]);
    expect(contract.modeFeedback.sceneExcluded).toBe(true);
  });
});
