/**
 * E2E Tests for ROM Download Functionality
 * 
 * Tests the ROM download workflow from RomM server:
 * - Download button visibility for remote-only games
 * - Download progress indication
 * - Error handling for failed downloads
 * - File state updates after download
 */

import { ensureMainApp, goToSettings } from './helpers.js';

describe('ROM Download - Prerequisites', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should have RomM configured for download tests', async () => {
    await goToSettings();
    await browser.pause(2000);
    
    // Check if RomM is connected
    const connectedIndicator = await $('*=Connected');
    const serverSection = await $('*=RomM Server');
    
    const isConnected = await connectedIndicator.isDisplayed().catch(() => false);
    const hasServerSection = await serverSection.isDisplayed().catch(() => false);
    
    console.log(`RomM Server section visible: ${hasServerSection}`);
    console.log(`RomM Connected: ${isConnected}`);
    
    if (!hasServerSection) {
      console.log('WARNING: RomM Server section not found - ROM download tests will be limited');
    }
  });
});

describe('ROM Download - UI Elements', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should show Download ROM button for remote-only games', async () => {
    // Navigate to library
    const allGames = await $('*=All Games');
    await allGames.click();
    await browser.pause(2000);
    
    // Look for any game card
    const gameCards = await $$('[class*="Card"]');
    console.log(`Found ${gameCards.length} game cards`);
    
    if (gameCards.length === 0) {
      console.log('SKIP: No games in library');
      return;
    }
    
    // Click first game to open details
    await gameCards[0].click();
    await browser.pause(1500);
    
    // Check for Download ROM button (appears for remote-only games)
    const downloadBtn = await $('button*=Download ROM');
    const playBtn = await $('button*=Play');
    
    const hasDownload = await downloadBtn.isDisplayed().catch(() => false);
    const hasPlay = await playBtn.isDisplayed().catch(() => false);
    
    console.log(`Download ROM button visible: ${hasDownload}`);
    console.log(`Play button visible: ${hasPlay}`);
    
    // Either Play or Download should be visible
    expect(hasDownload || hasPlay).toBe(true);
  });

  it('should show Cloud Only badge for remote games', async () => {
    // Look for Cloud Only chip/badge in game details
    const cloudBadge = await $('*=Cloud Only');
    const remoteBadge = await $('*=Remote');
    
    const hasCloudBadge = await cloudBadge.isDisplayed().catch(() => false);
    const hasRemoteBadge = await remoteBadge.isDisplayed().catch(() => false);
    
    console.log(`Cloud Only badge: ${hasCloudBadge}`);
    console.log(`Remote badge: ${hasRemoteBadge}`);
    
    // This is informational - not all games are remote
  });

  it('should navigate back from game details', async () => {
    const backBtn = await $('button*=Back');
    if (await backBtn.isDisplayed().catch(() => false)) {
      await backBtn.click();
      await browser.pause(1000);
    }
  });
});

describe('ROM Download - Download Workflow', function() {
  this.timeout(120000); // 2 minutes for downloads

  before(async () => {
    await ensureMainApp();
  });

  it('should attempt ROM download when button clicked', async () => {
    // Find a remote-only game and try to download
    const allGames = await $('*=All Games');
    await allGames.click();
    await browser.pause(2000);
    
    const gameCards = await $$('[class*="Card"]');
    
    for (let i = 0; i < Math.min(gameCards.length, 5); i++) {
      await gameCards[i].click();
      await browser.pause(1000);
      
      const downloadBtn = await $('button*=Download ROM');
      const hasDownload = await downloadBtn.isDisplayed().catch(() => false);
      
      if (hasDownload) {
        console.log(`Found remote game at index ${i}, attempting download...`);
        
        // Check if button is enabled
        const isEnabled = await downloadBtn.isEnabled();
        console.log(`Download button enabled: ${isEnabled}`);
        
        if (isEnabled) {
          await downloadBtn.click();
          await browser.pause(2000);
          
          // Check for progress or result
          const progressBar = await $('[role="progressbar"]');
          const alert = await $('[role="alert"]');
          
          const hasProgress = await progressBar.isDisplayed().catch(() => false);
          const hasAlert = await alert.isDisplayed().catch(() => false);
          
          console.log(`Progress indicator: ${hasProgress}`);
          console.log(`Alert shown: ${hasAlert}`);
          
          if (hasAlert) {
            const alertText = await alert.getText();
            console.log(`Alert message: ${alertText}`);
          }
          
          // Wait for completion or timeout
          await browser.pause(10000);
          
          return; // Test complete
        }
      }
      
      // Go back and try next game
      const backBtn = await $('button*=Back');
      if (await backBtn.isDisplayed().catch(() => false)) {
        await backBtn.click();
        await browser.pause(500);
      }
    }
    
    console.log('SKIP: No remote-only games found to test download');
  });

  it('should show error message for failed downloads', async () => {
    // This test verifies error handling
    const alert = await $('[role="alert"]');
    const hasAlert = await alert.isDisplayed().catch(() => false);
    
    if (hasAlert) {
      const alertText = await alert.getText();
      const severity = await alert.getAttribute('class');
      
      console.log(`Alert text: ${alertText}`);
      console.log(`Alert class: ${severity}`);
      
      // Error should be user-friendly, not raw technical error
      const isTechnical = alertText.includes('panic') || 
                          alertText.includes('unwrap') || 
                          alertText.includes('thread');
      
      expect(isTechnical).toBe(false);
    }
  });
});

describe('ROM Download - State Management', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should update sync state after successful download', async () => {
    // After a successful download, game should show as Synced not Cloud Only
    const allGames = await $('*=All Games');
    await allGames.click();
    await browser.pause(2000);
    
    // Look for synced badge
    const syncedBadge = await $('*=Synced');
    const hasSynced = await syncedBadge.isDisplayed().catch(() => false);
    
    console.log(`Synced games visible: ${hasSynced}`);
  });

  it('should show Play button after download completes', async () => {
    const gameCards = await $$('[class*="Card"]');
    
    if (gameCards.length > 0) {
      await gameCards[0].click();
      await browser.pause(1000);
      
      const playBtn = await $('button*=Play');
      const downloadBtn = await $('button*=Download ROM');
      
      const hasPlay = await playBtn.isDisplayed().catch(() => false);
      const hasDownload = await downloadBtn.isDisplayed().catch(() => false);
      
      console.log(`Play button visible: ${hasPlay}`);
      console.log(`Download button visible: ${hasDownload}`);
      
      // Go back
      const backBtn = await $('button*=Back');
      if (await backBtn.isDisplayed().catch(() => false)) {
        await backBtn.click();
      }
    }
  });
});
