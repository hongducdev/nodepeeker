import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BridgeSettingsModal } from '../src/ui/components/BridgeSettingsModal';

describe('BridgeSettingsModal static rendering', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      createElement(BridgeSettingsModal, {
        isOpen: false,
        onClose: () => {},
        bridgeState: { state: 'connected', enabled: true },
        onSetToken: () => {},
        onToggleEnabled: () => {},
      })
    );
    expect(html).toBe('');
  });

  it('renders status, token input, and quick setup guide when open', () => {
    const html = renderToStaticMarkup(
      createElement(BridgeSettingsModal, {
        isOpen: true,
        onClose: () => {},
        bridgeState: { state: 'connected', enabled: true },
        onSetToken: () => {},
        onToggleEnabled: () => {},
      })
    );

    expect(html).toContain('NodePeeker Bridge');
    expect(html).toContain('Connected');
    expect(html).toContain('Broker Token');
    expect(html).toContain('npm run bridge');
    expect(html).toContain('Save &amp; Connect');
  });

  it('renders disabled badge when bridge is disabled', () => {
    const html = renderToStaticMarkup(
      createElement(BridgeSettingsModal, {
        isOpen: true,
        onClose: () => {},
        bridgeState: { state: 'disabled', enabled: false },
        onSetToken: () => {},
        onToggleEnabled: () => {},
      })
    );

    expect(html).toContain('Disabled');
  });

  it('renders needs token badge when token is missing', () => {
    const html = renderToStaticMarkup(
      createElement(BridgeSettingsModal, {
        isOpen: true,
        onClose: () => {},
        bridgeState: { state: 'needs-token', enabled: true },
        onSetToken: () => {},
        onToggleEnabled: () => {},
      })
    );

    expect(html).toContain('Needs Token');
  });
});
