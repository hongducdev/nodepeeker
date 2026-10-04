import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseSemver, isNewerVersion, getCurrentVersion } from '../bridge/updater';
import { BridgeSettingsModal } from '../src/ui/components/BridgeSettingsModal';

describe('semver parsing and comparison', () => {
  it('parses valid semver with and without v prefix', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3]);
    expect(parseSemver('v2.0.1')).toEqual([2, 0, 1]);
    expect(parseSemver('v10.5')).toEqual([10, 5, 0]);
    expect(parseSemver('invalid')).toEqual([0, 0, 0]);
  });

  it('correctly compares newer versions', () => {
    // Higher patch
    expect(isNewerVersion('1.0.1', '1.0.0')).toBe(true);
    expect(isNewerVersion('v1.0.1', '1.0.0')).toBe(true);

    // Higher minor
    expect(isNewerVersion('1.1.0', '1.0.5')).toBe(true);
    expect(isNewerVersion('v2.0.0', '1.9.9')).toBe(true);

    // Equal or lower
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('v1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('0.9.9', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.1')).toBe(false);
  });

  it('reads current version from package.json', () => {
    const version = getCurrentVersion();
    expect(typeof version).toBe('string');
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('BridgeSettingsModal update banner rendering', () => {
  it('renders update banner and copyable command when update is available', () => {
    const html = renderToStaticMarkup(
      createElement(BridgeSettingsModal, {
        isOpen: true,
        onClose: () => {},
        bridgeState: {
          state: 'connected',
          enabled: true,
          update: {
            hasUpdate: true,
            currentVersion: '1.0.0',
            latestVersion: '1.1.0',
            releaseUrl: 'https://github.com/hongducdev/nodepeeker/releases',
          },
        },
        onSetToken: () => {},
        onToggleEnabled: () => {},
      })
    );

    expect(html).toContain('Update Available');
    expect(html).toContain('v1.1.0');
    expect(html).toContain('npm run update');
  });

  it('omits update banner when no update is available', () => {
    const html = renderToStaticMarkup(
      createElement(BridgeSettingsModal, {
        isOpen: true,
        onClose: () => {},
        bridgeState: {
          state: 'connected',
          enabled: true,
          update: {
            hasUpdate: false,
            currentVersion: '1.0.0',
          },
        },
        onSetToken: () => {},
        onToggleEnabled: () => {},
      })
    );

    expect(html).not.toContain('Update Available');
  });
});
