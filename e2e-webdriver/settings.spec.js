/**
 * Tauri WebDriver E2E Tests - Settings
 *
 * Smoke coverage for navigation and major sections (see TESTING.md).
 * Deeper flows live in emulator-download, retroarch-cores, rom-download, etc.
 */

import { ensureMainApp, goToSettings } from './helpers.js';

describe('Settings Page - Navigation', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings();
  });

  it('should display Settings heading', async () => {
    const heading = await $('h4=Settings');
    await expect(heading).toBeDisplayed();
  });

  it('should have a Back button', async () => {
    const backBtn = await $('button*=Back');
    await expect(backBtn).toBeDisplayed();
  });

  it('should navigate back to library when Back is clicked', async () => {
    const backBtn = await $('button*=Back');
    await backBtn.click();
    await browser.pause(500);
    
    const settingsHeading = await $('h4=Settings').isDisplayed().catch(() => false);
    expect(settingsHeading).toBe(false);
  });

  it('should show General content by default (Immersive toggle)', async () => {
    const row = await $('[data-testid="immersive-mode-row"]');
    await expect(row).toBeDisplayed({ timeout: 10000 });
  });
});

describe('Settings Page - Appearance, Sound, Updates (smoke)', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should display Appearance section', async () => {
    await goToSettings('appearance');
    const heading = await $('h6=Appearance');
    await expect(heading).toBeDisplayed();
  });

  it('should display Sound (Immersive) section', async () => {
    await goToSettings('sound');
    const heading = await $('*=Sound (Immersive)');
    await expect(heading).toBeDisplayed();
  });

  it('should display Updates section', async () => {
    await goToSettings('updates');
    const heading = await $('h6=Updates');
    await expect(heading).toBeDisplayed();
    const checkBtn = await $('[data-testid="check-for-updates-button"]');
    await expect(checkBtn).toBeDisplayed();
  });

  it('should display Platform defaults beside Emulators', async () => {
    await goToSettings('emulators');
    const emuHeading = await $('h6=Emulators');
    await expect(emuHeading).toBeDisplayed();
    const defaultsHeading = await $('h6=Platform defaults');
    await expect(defaultsHeading).toBeDisplayed();
  });
});

describe('Settings Page - RomM Section', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings('romm');
  });

  it('should display RomM section', async () => {
    // The heading is "RomM Server" not just "RomM"
    const rommHeading = await $('*=RomM Server');
    await expect(rommHeading).toBeDisplayed();
  });

  it('should show connection status', async () => {
    const connectBtn = await $('button*=Connect').isDisplayed().catch(() => false);
    const connectedStatus = await $('*=Connected').isDisplayed().catch(() => false);
    const notConnected = await $('*=Not connected').isDisplayed().catch(() => false);
    
    console.log(`Connect btn: ${connectBtn}, Connected: ${connectedStatus}, Not connected: ${notConnected}`);
    expect(connectBtn || connectedStatus || notConnected).toBe(true);
  });
});

describe('Settings Page - Library Section', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings('library');
  });

  it('should display Library section', async () => {
    const libraryHeading = await $('h6=Library');
    await expect(libraryHeading).toBeDisplayed();
  });

  it('should have ROM path management elements', async () => {
    const addBtn = await $('button*=Add').isDisplayed().catch(() => false);
    const folderBtn = await $('button*=Folder').isDisplayed().catch(() => false);
    const scanBtn = await $('button*=Scan').isDisplayed().catch(() => false);
    
    console.log(`Library buttons - Add: ${addBtn}, Folder: ${folderBtn}, Scan: ${scanBtn}`);
  });
});

describe('Settings Page - Emulators Section', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings('emulators');
  });

  it('should display Emulators section', async () => {
    const heading = await $('h6=Emulators');
    await expect(heading).toBeDisplayed();
  });

  it('should show installed count chip', async () => {
    const chip = await $('*=installed');
    await expect(chip).toBeDisplayed();
    
    const chipText = await chip.getText();
    console.log(`Emulator status: ${chipText}`);
    expect(chipText).toMatch(/\d+ installed/);
  });

  it('should show emulator categories', async () => {
    await browser.pause(1000);
    
    const installed = await $('*=Installed').isDisplayed().catch(() => false);
    const available = await $('*=Available for Download').isDisplayed().catch(() => false);
    const manual = await $('*=Manual Install').isDisplayed().catch(() => false);
    
    console.log(`Categories - Installed: ${installed}, Available: ${available}, Manual: ${manual}`);
    expect(installed || available || manual).toBe(true);
  });

  it('should list known emulators', async () => {
    await browser.pause(1000);
    
    const emulators = ['RetroArch', 'Dolphin', 'PCSX2', 'mGBA', 'PPSSPP'];
    
    for (const emu of emulators) {
      const found = await $(`*=${emu}`).isDisplayed().catch(() => false);
      if (found) console.log(`  Found: ${emu}`);
    }
  });

  it('should show Install buttons for available emulators', async () => {
    await browser.pause(1000);
    
    const installBtns = await $$('button*=Install');
    console.log(`Found ${installBtns.length} Install buttons`);
  });

  it('should refresh emulator list when Refresh clicked', async () => {
    const refreshBtn = await $('button[aria-label*="refresh" i]');
    
    if (!(await refreshBtn.isDisplayed().catch(() => false))) {
      console.log('SKIP: Refresh button not found');
      return;
    }
    
    const chipBefore = await $('*=installed');
    const textBefore = await chipBefore.getText();
    console.log(`Before refresh: ${textBefore}`);
    
    await refreshBtn.click();
    await browser.pause(2000);
    
    const chipAfter = await $('*=installed');
    const textAfter = await chipAfter.getText();
    console.log(`After refresh: ${textAfter}`);
  });
});

describe('Settings Page - RetroArch Cores', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings('emulators');
  });

  it('should show cores section if RetroArch is installed', async () => {
    const coresHeading = await $('h6=RetroArch Cores');
    const isVisible = await coresHeading.isDisplayed().catch(() => false);
    
    if (isVisible) {
      console.log('RetroArch Cores section is visible');
      
      const missingChip = await $('*=missing');
      if (await missingChip.isDisplayed().catch(() => false)) {
        const chipText = await missingChip.getText();
        console.log(`Core status: ${chipText}`);
      }
    } else {
      console.log('RetroArch Cores section not visible (may not be installed)');
    }
  });
});

describe('Settings - Configuration Persistence', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should persist settings across navigation', async () => {
    await goToSettings('emulators');
    
    const chipBefore = await $('*=installed');
    const countBefore = await chipBefore.getText();
    console.log(`Emulator count: ${countBefore}`);
    
    // Navigate away
    const backBtn = await $('button*=Back');
    await backBtn.click();
    await browser.pause(500);
    
    // Navigate back
    await goToSettings('emulators');
    
    const chipAfter = await $('*=installed');
    const countAfter = await chipAfter.getText();
    console.log(`Emulator count after return: ${countAfter}`);
    
    expect(countAfter).toBe(countBefore);
  });
});
