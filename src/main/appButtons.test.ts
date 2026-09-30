import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { closeProjectScript, zoomScript } from './appButtons';

interface FakeButton {
  visible: boolean;
  clicks: number;
  checkVisibility(): boolean;
  click(): void;
}

function button(visible: boolean): FakeButton {
  return {
    visible,
    clicks: 0,
    checkVisibility() {
      return this.visible;
    },
    click() {
      this.clicks++;
    },
  };
}

/** Runs a page script against a fake document, like executeJavaScript would */
function runInPage(script: string, buttons: Record<string, FakeButton[]>): unknown {
  const document = {
    querySelectorAll: (selector: string) =>
      Object.entries(buttons)
        .filter(([iconClass]) => selector.includes(`svg.${iconClass})`))
        .flatMap(([, list]) => list),
  };
  return vm.runInNewContext(script, { document });
}

describe('zoomScript', () => {
  it('clicks the first visible button of the action', () => {
    const hidden = button(false);
    const visible = button(true);
    const other = button(true);
    const result = runInPage(zoomScript('in'), {
      'lucide-zoom-in': [hidden, visible],
      'lucide-zoom-out': [other],
    });
    expect(result).toBe(true);
    expect([hidden.clicks, visible.clicks, other.clicks]).toEqual([0, 1, 0]);
  });

  it('uses the maximize icon for zoom to fit', () => {
    const fit = button(true);
    expect(runInPage(zoomScript('fit'), { 'lucide-maximize': [fit] })).toBe(true);
    expect(fit.clicks).toBe(1);
  });

  it('returns false when only hidden buttons exist', () => {
    expect(runInPage(zoomScript('out'), { 'lucide-zoom-out': [button(false)] })).toBe(false);
  });
});

describe('closeProjectScript', () => {
  it('clicks the home button', () => {
    const home = button(true);
    expect(runInPage(closeProjectScript(), { 'lucide-house': [home] })).toBe(true);
    expect(home.clicks).toBe(1);
  });

  it('returns false outside a project', () => {
    expect(runInPage(closeProjectScript(), {})).toBe(false);
  });
});
