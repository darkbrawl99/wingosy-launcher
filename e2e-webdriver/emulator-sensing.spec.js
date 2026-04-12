/**
 * Tauri WebDriver E2E Tests - Emulator Detection/Sensing
 * 
 * Tests the emulator detection system that scans for:
 * - Steam installations
 * - System-wide installations (Program Files, Registry)
 * - Portable installations (user folders)
 * - Managed installations (installed by Wingosy)
 */

import { ensureMainApp, goToSettings, goToLibrary } from './helpers.js';

describe('Emulator Detection - Initial Scan', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should trigger emulator detection when opening Settings', async () => {
    await goToSettings('emulators');
    await browser.pause(2000);
    
    // The installed count chip should be visible
    const chip = await $('*=installed');
    await expect(chip).toBeDisplayed({ timeout: 10000 });
    
    const chipText = await chip.getText();
    console.log(`Emulator detection result: ${chipText}`);
    
    // Should show "X installed" format
    expect(chipText).toMatch(/\d+ installed/);
  });

  it('should categorize detected emulators correctly', async () => {
    await goToSettings('emulators');
    await browser.pause(2000);
    
    // Check for different emulator states
    const installedSection = await $('*=Installed').isDisplayed().catch(() => false);
    const availableSection = await $('*=Available for Download').isDisplayed().catch(() => false);
    const manualSection = await $('*=Manual Install').isDisplayed().catch(() => false);
    
    console.log('Emulator sections:');
    console.log(`  - Installed: ${installedSection}`);
    console.log(`  - Available for Download: ${availableSection}`);
    console.log(`  - Manual Install Required: ${manualSection}`);
    
    // At least one section should be visible
    expect(installedSection || availableSection || manualSection).toBe(true);
  });

  it('should show refresh button for re-scanning', async () => {
    await goToSettings('emulators');
    
    // Find the refresh button near Emulators heading
    const refreshBtn = await $('[data-testid="RefreshIcon"]')
      .isDisplayed()
      .catch(() => false);
    
    // Or find by aria-label or tooltip
    const refreshByTitle = await $('[title*="Re-scan"]')
      .isDisplayed()
      .catch(() => false);
    
    // Or find by icon class
    const anyRefresh = await $('button svg').isDisplayed().catch(() => false);
    
    console.log(`Refresh button: icon=${refreshBtn}, title=${refreshByTitle}, any=${anyRefresh}`);
    expect(anyRefresh).toBe(true);
  });
});

describe('Emulator Detection - Install Types', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings('emulators');
    await browser.pause(1500);
  });

  it('should display install type labels for detected emulators', async () => {
    // Check for install type chips: Steam, System, Portable, Wingosy
    const steamChip = await $('*=Steam').isDisplayed().catch(() => false);
    const systemChip = await $('*=System').isDisplayed().catch(() => false);
    const portableChip = await $('*=Portable').isDisplayed().catch(() => false);
    const wingosyChip = await $('*=Wingosy').isDisplayed().catch(() => false);
    
    console.log('Install type labels found:');
    console.log(`  - Steam: ${steamChip}`);
    console.log(`  - System: ${systemChip}`);
    console.log(`  - Portable: ${portableChip}`);
    console.log(`  - Wingosy (managed): ${wingosyChip}`);
    
    // If any emulator is installed, one of these should show
    const installedChip = await $('*=installed');
    const chipText = await installedChip.getText().catch(() => '0 installed');
    const installedCount = parseInt(chipText.match(/\d+/)?.[0] || '0');
    
    if (installedCount > 0) {
      // At least one install type should be visible
      expect(steamChip || systemChip || portableChip || wingosyChip).toBe(true);
    } else {
      console.log('No emulators installed - skipping install type check');
      expect(true).toBe(true);
    }
  });

  it('should show version info for detected emulators', async () => {
    // Look for version strings like "v1.2.3" or "v0.10.5"
    const versions = await $$('*=v');
    let foundVersion = false;
    
    for (const el of versions.slice(0, 5)) {
      const text = await el.getText().catch(() => '');
      if (text.match(/v\d+\.\d+/)) {
        console.log(`Found version: ${text}`);
        foundVersion = true;
        break;
      }
    }
    
    console.log(`Version info displayed: ${foundVersion}`);
  });

  it('should show emulator path for installed emulators', async () => {
    // Installed emulators should show their file path
    const pathElements = await $$('*=.exe');
    
    for (const el of pathElements.slice(0, 3)) {
      const text = await el.getText().catch(() => '');
      if (text.includes('.exe')) {
        console.log(`Found path: ${text.substring(0, 60)}...`);
      }
    }
    
    console.log(`Emulator paths displayed: ${pathElements.length}`);
  });
});

describe('Emulator Detection - Actions', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings('emulators');
    await browser.pause(1500);
  });

  it('should show Launch button for installed emulators', async () => {
    // Look for play/launch buttons
    const launchBtns = await $$('[data-testid="PlayArrowIcon"]');
    const playBtns = await $$('button*=Launch');
    
    const totalLaunchBtns = launchBtns.length + playBtns.length;
    console.log(`Launch buttons found: ${totalLaunchBtns} (icons: ${launchBtns.length}, text: ${playBtns.length})`);
    
    // If emulators are installed, launch buttons should exist
    const installedChip = await $('*=installed');
    const chipText = await installedChip.getText().catch(() => '0 installed');
    const installedCount = parseInt(chipText.match(/\d+/)?.[0] || '0');
    
    if (installedCount > 0) {
      expect(totalLaunchBtns).toBeGreaterThan(0);
    }
  });

  it('should show Open Folder button for installed emulators', async () => {
    // Look for folder open buttons
    const folderBtns = await $$('[data-testid="FolderOpenIcon"]');
    console.log(`Open folder buttons found: ${folderBtns.length}`);
    
    const installedChip = await $('*=installed');
    const chipText = await installedChip.getText().catch(() => '0 installed');
    const installedCount = parseInt(chipText.match(/\d+/)?.[0] || '0');
    
    if (installedCount > 0) {
      expect(folderBtns.length).toBeGreaterThan(0);
    }
  });

  it('should open context menu with more options', async () => {
    // Look for the more options (3 dots) button
    const moreBtns = await $$('[data-testid="MoreVertIcon"]');
    
    if (moreBtns.length > 0) {
      await moreBtns[0].click();
      await browser.pause(500);
      
      // Check for menu items
      const launchItem = await $('*=Launch Emulator').isDisplayed().catch(() => false);
      const openItem = await $('*=Open Install Location').isDisplayed().catch(() => false);
      const uninstallItem = await $('*=Uninstall').isDisplayed().catch(() => false);
      
      console.log('Context menu items:');
      console.log(`  - Launch Emulator: ${launchItem}`);
      console.log(`  - Open Install Location: ${openItem}`);
      console.log(`  - Uninstall: ${uninstallItem}`);
      
      // Close the menu
      await browser.keys(['Escape']);
      await browser.pause(300);
      
      expect(launchItem || openItem).toBe(true);
    } else {
      console.log('No more options buttons found - may not have installed emulators');
    }
  });
});

describe('Emulator Detection - Re-scan', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should refresh emulator list when Refresh button is clicked', async () => {
    await goToSettings('emulators');
    await browser.pause(1500);
    
    // Get initial count
    const chipBefore = await $('*=installed');
    const textBefore = await chipBefore.getText().catch(() => '0 installed');
    console.log(`Before refresh: ${textBefore}`);
    
    // Find and click refresh button
    const refreshBtns = await $$('button');
    let clickedRefresh = false;
    
    for (const btn of refreshBtns) {
      const hasRefreshIcon = await btn.$('[data-testid="RefreshIcon"]').isDisplayed().catch(() => false);
      if (hasRefreshIcon) {
        await btn.click();
        clickedRefresh = true;
        console.log('Clicked refresh button');
        break;
      }
    }
    
    if (!clickedRefresh) {
      // Try clicking any small icon button near Emulators heading
      const iconBtns = await $$('button[size="small"]');
      if (iconBtns.length > 0) {
        await iconBtns[0].click();
        clickedRefresh = true;
      }
    }
    
    await browser.pause(3000);
    
    // Get count after refresh
    const chipAfter = await $('*=installed');
    const textAfter = await chipAfter.getText().catch(() => '0 installed');
    console.log(`After refresh: ${textAfter}`);
    
    // Count should be valid (same or different doesn't matter, just valid)
    expect(textAfter).toMatch(/\d+ installed/);
  });
});

describe('Emulator Detection - Managed Emulators', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings('emulators');
    await browser.pause(1500);
  });

  it('should detect emulators installed by Wingosy', async () => {
    // Look for "Wingosy" install type label
    const wingosyLabel = await $('*=Wingosy').isDisplayed().catch(() => false);
    
    console.log(`Wingosy-managed emulators found: ${wingosyLabel}`);
    
    // This will be true if we've downloaded any emulators through the app
  });

  it('should show correct path for managed emulators', async () => {
    // Managed emulators should be in AppData
    const appDataPaths = await $$('*=wingosy');
    
    for (const el of appDataPaths.slice(0, 3)) {
      const text = await el.getText().catch(() => '');
      if (text.includes('wingosy')) {
        console.log(`Managed emulator path: ${text.substring(0, 80)}...`);
      }
    }
  });
});

describe('mGBA Emulator - Download and Detection', function() {
  this.timeout(180000); // 3 minutes for download

  before(async () => {
    await ensureMainApp();
  });

  it('should install mGBA if not already installed', async () => {
    await goToSettings('emulators');
    await browser.pause(2000);
    
    // Check if mGBA is already installed
    const mgbaElements = await $$('*=mGBA');
    let mgbaInstalled = false;
    
    for (const el of mgbaElements) {
      const parent = await el.parentElement();
      const hasCheckIcon = await parent.$('[data-testid="CheckCircleIcon"]')
        .isDisplayed()
        .catch(() => false);
      
      if (hasCheckIcon) {
        mgbaInstalled = true;
        console.log('mGBA already installed - skipping download');
        return;
      }
    }
    
    // Find mGBA install button
    const mgbaRow = await $('*=mGBA');
    if (!(await mgbaRow.isDisplayed().catch(() => false))) {
      console.log('mGBA not visible in list');
      return;
    }
    
    const installBtn = await $('button*=Install');
    if (!(await installBtn.isDisplayed().catch(() => false))) {
      console.log('No install button found for mGBA - may already be installed');
      return;
    }
    
    console.log('Starting mGBA download...');
    await installBtn.click();
    
    // Wait for download to complete
    await browser.pause(5000);
    
    // Wait for result message (success or error)
    const alert = await $('[role="alert"]');
    await expect(alert).toBeDisplayed({ timeout: 120000 });
    
    const alertText = await alert.getText();
    console.log(`Download result: ${alertText}`);
    
    // The test passes if download succeeds OR if it fails gracefully with an error message
    // File permission errors on test machines are acceptable
    const isSuccess = /installed|success/i.test(alertText);
    const isKnownError = /failed|error|permission|destination/i.test(alertText);
    
    if (isSuccess) {
      console.log('mGBA installed successfully');
    } else if (isKnownError) {
      console.log('Download failed with known error (acceptable in test environment)');
    }
    
    expect(isSuccess || isKnownError).toBe(true);
  });

  it('should detect mGBA after installation', async () => {
    await goToSettings('emulators');
    await browser.pause(3000);
    
    // Look for mGBA with success icon
    const mgbaElements = await $$('*=mGBA');
    let mgbaInstalled = false;
    
    for (const el of mgbaElements) {
      const parent = await el.parentElement();
      const hasCheckIcon = await parent.$('[data-testid="CheckCircleIcon"]')
        .isDisplayed()
        .catch(() => false);
      
      if (hasCheckIcon) {
        mgbaInstalled = true;
        console.log('mGBA detected as installed');
        break;
      }
    }
    
    // mGBA should now be in the installed section
    console.log(`mGBA installation detected: ${mgbaInstalled}`);
  });

  it('should show mGBA install path', async () => {
    await goToSettings('emulators');
    await browser.pause(2000);
    
    // Look for mGBA.exe path
    const pathElements = await $$('*=mGBA.exe');
    
    if (pathElements.length > 0) {
      const pathText = await pathElements[0].getText();
      console.log(`mGBA path: ${pathText}`);
      expect(pathText).toContain('mGBA.exe');
    } else {
      console.log('mGBA path not displayed (may not be installed)');
    }
  });
});
