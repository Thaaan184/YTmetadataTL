import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Extension UI Structure & Accessibility', () => {
  const htmlPath = path.resolve(__dirname, '../../entrypoints/popup/index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  it('contains valid tab navigation buttons and matching sections', () => {
    expect(htmlContent).toContain('id="tab-btn-subtitles"');
    expect(htmlContent).toContain('id="tab-btn-metadata"');
    expect(htmlContent).toContain('id="tab-btn-settings"');

    expect(htmlContent).toContain('id="tab-subtitles"');
    expect(htmlContent).toContain('id="tab-metadata"');
    expect(htmlContent).toContain('id="tab-settings"');
  });

  it('contains character counter limits matching YouTube policies', () => {
    expect(htmlContent).toContain('maxlength="100"'); // YouTube title limit
    expect(htmlContent).toContain('maxlength="5000"'); // YouTube description limit
    expect(htmlContent).toContain('0 / 100');
    expect(htmlContent).toContain('0 / 5000');
  });

  it('contains accessible labels and input controls', () => {
    expect(htmlContent).toContain('<label for="subtitles-target-locale">');
    expect(htmlContent).toContain('<label for="meta-source-title">');
    expect(htmlContent).toContain('<label for="meta-source-desc">');
    expect(htmlContent).toContain('<label for="settings-provider-select">');
    expect(htmlContent).toContain('<label for="settings-base-url">');
    expect(htmlContent).toContain('<label for="settings-model">');
    expect(htmlContent).toContain('<label for="settings-api-key">');
  });

  it('contains prominent security notice about unencrypted local storage', () => {
    expect(htmlContent).toContain('Warning: Keys are held in-memory during the browser session by default');
    expect(htmlContent).toContain('not encrypted by Chrome');
  });

  it('contains manual export and clipboard fallback buttons', () => {
    expect(htmlContent).toContain('id="download-subtitles-btn"');
    expect(htmlContent).toContain('id="copy-subtitles-btn"');
    expect(htmlContent).toContain('id="copy-meta-title-btn"');
    expect(htmlContent).toContain('id="copy-meta-desc-btn"');
    expect(htmlContent).toContain('id="copy-meta-tags-btn"');
  });
});
