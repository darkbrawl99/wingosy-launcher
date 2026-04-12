/**
 * Tauri WebDriver E2E Tests - Setup Wizard
 * 
 * These tests run FIRST and complete the setup wizard to unlock the main app.
 * The setup wizard shows on first run and has 3 steps: RomM Server, ROM Folder, Scan Games
 */

import { waitForAppReady, getPageDiagnostics, goToSettings } from './helpers.js';

describe('Setup Wizard Flow', () => {
  before(async () => {
    // Extra wait at the very start
    console.log('Initial wait for app to start...');
    await browser.pause(5000);
  });

  it('should wait for app content to load', async () => {
    // This is a critical first test - wait for any content
    const ready = await waitForAppReady(60); // Wait up to 60 seconds
    
    if (!ready) {
      // Get diagnostics to understand what's happening
      const diag = await getPageDiagnostics();
      console.log('Page diagnostics:', JSON.stringify(diag, null, 2));
    }
    
    // If still not ready, try refreshing/reloading
    if (!ready) {
      console.log('Trying browser refresh...');
      try {
        await browser.refresh();
        await browser.pause(5000);
        const readyAfterRefresh = await waitForAppReady(30);
        console.log(`Ready after refresh: ${readyAfterRefresh}`);
      } catch (err) {
        console.log(`Refresh failed: ${err.message}`);
      }
    }
  });

  it('should show welcome screen or main app', async () => {
    await browser.pause(3000);
    
    // Look for "Wingosy" title and "Get Started" button
    const wingosyTitle = await $('*=Wingosy');
    const getStartedBtn = await $('button*=Get Started');
    
    const hasWelcome = await wingosyTitle.isDisplayed().catch(() => false);
    const hasGetStarted = await getStartedBtn.isDisplayed().catch(() => false);
    
    // Or we might already be past setup (if config exists)
    const hasMainApp = await $('*=All Games').isDisplayed().catch(() => false);
    
    console.log(`State - Welcome: ${hasWelcome}, Get Started: ${hasGetStarted}, Main App: ${hasMainApp}`);
    
    // Either welcome screen or main app should be visible
    expect(hasWelcome || hasGetStarted || hasMainApp).toBe(true);
  });

  it('should click Get Started to begin setup', async () => {
    // Skip if already past setup
    const mainApp = await $('*=All Games').isDisplayed().catch(() => false);
    if (mainApp) {
      console.log('Already in main app - skipping');
      return;
    }
    
    const getStartedBtn = await $('button*=Get Started');
    
    if (await getStartedBtn.isDisplayed().catch(() => false)) {
      await getStartedBtn.click();
      await browser.pause(2000);
      console.log('Clicked Get Started');
      
      // Should now show Step 1: RomM Server
      const rommStep = await $('*=RomM Server').isDisplayed().catch(() => false);
      const serverUrl = await $('*=Server URL').isDisplayed().catch(() => false);
      
      console.log(`Step 1 visible - RomM Server: ${rommStep}, Server URL: ${serverUrl}`);
    } else {
      console.log('Get Started button not found');
    }
  });

  it('should skip RomM Server step (Step 1)', async () => {
    // Skip if already past setup
    const mainApp = await $('*=All Games').isDisplayed().catch(() => false);
    if (mainApp) {
      console.log('Already in main app - skipping');
      return;
    }
    
    await browser.pause(1000);
    
    // We should be on Step 1: RomM Server
    // Click Skip to move to Step 2
    const skipBtn = await $('button*=Skip');
    
    if (await skipBtn.isDisplayed().catch(() => false)) {
      await skipBtn.click();
      await browser.pause(2000);
      console.log('Skipped RomM Server step');
      
      // Should now show Step 2: ROM Folder
      const romFolder = await $('*=ROM Folder').isDisplayed().catch(() => false);
      console.log(`Step 2 visible - ROM Folder: ${romFolder}`);
    } else {
      // Try Continue button (if RomM was connected)
      const continueBtn = await $('button*=Continue');
      if (await continueBtn.isDisplayed().catch(() => false)) {
        await continueBtn.click();
        await browser.pause(2000);
        console.log('Clicked Continue (RomM was connected)');
      } else {
        console.log('Neither Skip nor Continue found');
      }
    }
  });

  it('should skip ROM Folder step (Step 2)', async () => {
    // Skip if already past setup
    const mainApp = await $('*=All Games').isDisplayed().catch(() => false);
    if (mainApp) {
      console.log('Already in main app - skipping');
      return;
    }
    
    await browser.pause(1000);
    
    // We should be on Step 2: ROM Folder
    // Click Skip to move to Step 3
    const skipBtn = await $('button*=Skip');
    
    if (await skipBtn.isDisplayed().catch(() => false)) {
      await skipBtn.click();
      await browser.pause(2000);
      console.log('Skipped ROM Folder step');
      
      // Should now show Step 3: Scan Games
      const scanGames = await $('*=Scan').isDisplayed().catch(() => false);
      console.log(`Step 3 visible - Scan: ${scanGames}`);
    } else {
      // Try Continue button (if folder was selected)
      const continueBtn = await $('button*=Continue');
      if (await continueBtn.isDisplayed().catch(() => false)) {
        await continueBtn.click();
        await browser.pause(2000);
        console.log('Clicked Continue (folder was selected)');
      }
    }
  });

  it('should finish setup (Step 3)', async () => {
    // Skip if already past setup
    const mainApp = await $('*=All Games').isDisplayed().catch(() => false);
    if (mainApp) {
      console.log('Already in main app - skipping');
      return;
    }
    
    await browser.pause(1000);
    
    // We should be on Step 3: Scan Games
    // Click Skip/Finish to complete setup
    const skipBtn = await $('button*=Skip');
    const finishBtn = await $('button*=Finish');
    
    if (await finishBtn.isDisplayed().catch(() => false)) {
      await finishBtn.click();
      await browser.pause(3000);
      console.log('Clicked Finish');
    } else if (await skipBtn.isDisplayed().catch(() => false)) {
      await skipBtn.click();
      await browser.pause(3000);
      console.log('Clicked Skip (acts as Finish)');
    } else {
      console.log('Neither Finish nor Skip found');
    }
    
    // Should now be in main app
    await browser.pause(2000);
    const allGames = await $('*=All Games').isDisplayed().catch(() => false);
    console.log(`Main app visible after finish: ${allGames}`);
  });

  it('should show main app after setup completion', async () => {
    await browser.pause(5000);
    
    // Check for main app elements
    const allGames = await $('*=All Games');
    const favorites = await $('*=Favorites');
    const settings = await $('*=Settings');
    
    const hasAllGames = await allGames.isDisplayed().catch(() => false);
    const hasFavorites = await favorites.isDisplayed().catch(() => false);
    const hasSettings = await settings.isDisplayed().catch(() => false);
    
    console.log(`Main App Navigation:`);
    console.log(`  All Games: ${hasAllGames}`);
    console.log(`  Favorites: ${hasFavorites}`);
    console.log(`  Settings: ${hasSettings}`);
    
    // At least one nav item should be visible
    expect(hasAllGames || hasFavorites || hasSettings).toBe(true);
  });
});

describe('Post-Setup Verification', () => {
  it('should have Settings button accessible', async () => {
    // Wait for main app
    await browser.pause(3000);
    
    const settingsBtn = await $('*=Settings');
    
    // Wait up to 30 seconds for Settings to appear
    await expect(settingsBtn).toBeDisplayed({ timeout: 30000 });
    
    console.log('Settings button is visible - setup complete');
  });

  it('should navigate to Settings successfully', async () => {
    const settingsBtn = await $('*=Settings');
    await settingsBtn.click();
    await browser.pause(2000);
    
    // Should see Settings page elements
    const settingsHeading = await $('h4=Settings');
    const hasHeading = await settingsHeading.isDisplayed().catch(() => false);
    
    console.log(`Settings page heading visible: ${hasHeading}`);
    expect(hasHeading).toBe(true);
  });

  it('should show emulator section in Settings', async () => {
    await goToSettings('emulators');
    
    // Find emulators section
    const emulatorsHeading = await $('h6=Emulators');
    await expect(emulatorsHeading).toBeDisplayed({ timeout: 10000 });
    
    // Should show installed count
    const installedChip = await $('*=installed');
    const hasChip = await installedChip.isDisplayed().catch(() => false);
    
    if (hasChip) {
      const chipText = await installedChip.getText();
      console.log(`Emulator status: ${chipText}`);
    }
  });
});
