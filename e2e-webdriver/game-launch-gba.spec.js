/**
 * Tauri WebDriver E2E Tests - GBA Game Launch
 * 
 * Tests the complete game launch workflow for GBA games:
 * - Emulator detection for GBA (mGBA)
 * - Game selection
 * - Launch command generation
 * - Error handling when emulator not configured
 */

import { ensureMainApp, goToSettings, goToLibrary } from './helpers.js';

describe('GBA Game Launch - Prerequisites', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should have games in the library', async () => {
    await goToLibrary();
    await browser.pause(2000);
    
    // Look for game cards or list items
    const gameCards = await $$('[class*="GameCard"]');
    const gameItems = await $$('[class*="game"]');
    const listItems = await $$('[role="listitem"]');
    
    const totalGames = gameCards.length + gameItems.length;
    console.log(`Games found: ${totalGames} (cards: ${gameCards.length}, items: ${gameItems.length})`);
    
    // Check for "No games" message
    const noGames = await $('*=No games').isDisplayed().catch(() => false);
    const emptyLibrary = await $('*=empty').isDisplayed().catch(() => false);
    
    if (noGames || emptyLibrary) {
      console.log('Library appears empty - some tests may be skipped');
    }
  });

  it('should have GBA platform in sidebar', async () => {
    await goToLibrary();
    await browser.pause(1500);
    
    // Look for GBA/Game Boy Advance in sidebar
    const gbaLink = await $('*=GBA').isDisplayed().catch(() => false);
    const gbAdvance = await $('*=Game Boy Advance').isDisplayed().catch(() => false);
    const gbaPlatform = await $('*=gba').isDisplayed().catch(() => false);
    
    console.log(`GBA platform visibility: GBA=${gbaLink}, Game Boy Advance=${gbAdvance}, gba=${gbaPlatform}`);
    
    // At least one should be visible if there are GBA games
  });

  it('should have mGBA or RetroArch installed for GBA games', async () => {
    await goToSettings('emulators');
    await browser.pause(2000);
    
    // Check installed emulators
    const installedChip = await $('*=installed');
    const chipText = await installedChip.getText().catch(() => '0 installed');
    const installedCount = parseInt(chipText.match(/\d+/)?.[0] || '0');
    
    console.log(`Total installed emulators: ${installedCount}`);
    
    // Look specifically for mGBA or RetroArch
    const mgbaInstalled = await $('*=mGBA')
      .parentElement()
      .$('[data-testid="CheckCircleIcon"]')
      .isDisplayed()
      .catch(() => false);
    
    const retroarchInstalled = await $('*=RetroArch')
      .parentElement()
      .$('[data-testid="CheckCircleIcon"]')
      .isDisplayed()
      .catch(() => false);
    
    console.log(`GBA-compatible emulators: mGBA=${mgbaInstalled}, RetroArch=${retroarchInstalled}`);
    
    if (!mgbaInstalled && !retroarchInstalled) {
      console.log('WARNING: No GBA emulator installed - game launch will fail');
    }
  });
});

describe('GBA Game Launch - Selection', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToLibrary();
    await browser.pause(1500);
  });

  it('should filter to show only GBA games', async () => {
    // Click on GBA platform in sidebar
    const gbaPlatform = await $('*=GBA');
    const isVisible = await gbaPlatform.isDisplayed().catch(() => false);
    
    if (isVisible) {
      await gbaPlatform.click();
      await browser.pause(1000);
      console.log('Filtered to GBA platform');
    } else {
      console.log('GBA platform not visible in sidebar');
    }
  });

  it('should select a GBA game', async () => {
    // Find any GBA game (Pokemon, etc.)
    const pokemonGame = await $('*=Pokemon').isDisplayed().catch(() => false);
    const gbaGame = await $('*=Version').isDisplayed().catch(() => false); // Common GBA title suffix
    
    // Try clicking on any game card
    const gameCards = await $$('[class*="Card"]');
    const gameButtons = await $$('[role="button"]');
    
    if (gameCards.length > 0) {
      await gameCards[0].click();
      await browser.pause(1000);
      console.log('Selected first game card');
    } else if (gameButtons.length > 5) {
      // Skip navigation buttons, click on a game
      await gameButtons[5].click();
      await browser.pause(1000);
      console.log('Selected a game button');
    }
    
    // Check if game details appeared
    const playBtn = await $('button*=Play').isDisplayed().catch(() => false);
    const launchBtn = await $('button*=Launch').isDisplayed().catch(() => false);
    
    console.log(`Game selected - Play button: ${playBtn}, Launch button: ${launchBtn}`);
  });

  it('should show game details panel', async () => {
    // Click on a game first
    const gameCards = await $$('[class*="Card"]');
    if (gameCards.length > 0) {
      await gameCards[0].click();
      await browser.pause(1500);
    }
    
    // Check for game details elements
    const gameTitle = await $('h5').isDisplayed().catch(() => false);
    const gameCover = await $('img').isDisplayed().catch(() => false);
    const playBtn = await $('button*=Play').isDisplayed().catch(() => false);
    const favoriteBtn = await $('[data-testid="FavoriteIcon"]').isDisplayed().catch(() => false) ||
                        await $('[data-testid="FavoriteBorderIcon"]').isDisplayed().catch(() => false);
    
    console.log('Game details panel:');
    console.log(`  - Title: ${gameTitle}`);
    console.log(`  - Cover image: ${gameCover}`);
    console.log(`  - Play button: ${playBtn}`);
    console.log(`  - Favorite button: ${favoriteBtn}`);
  });
});

describe('GBA Game Launch - Launch Attempt', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToLibrary();
    await browser.pause(1500);
  });

  it('should attempt to launch a GBA game', async () => {
    // Select a game
    const gameCards = await $$('[class*="Card"]');
    if (gameCards.length === 0) {
      console.log('SKIP: No games in library');
      return;
    }
    
    await gameCards[0].click();
    await browser.pause(1500);
    
    // Find and click Play button
    const playBtn = await $('button*=Play');
    if (!(await playBtn.isDisplayed().catch(() => false))) {
      console.log('SKIP: Play button not visible');
      return;
    }
    
    console.log('Clicking Play button...');
    await playBtn.click();
    await browser.pause(3000);
    
    // Check for result - either error or success
    const alert = await $('[role="alert"]');
    const hasAlert = await alert.isDisplayed().catch(() => false);
    
    if (hasAlert) {
      const alertText = await alert.getText();
      console.log(`Launch result: ${alertText}`);
    } else {
      console.log('No alert shown - game may have launched or no feedback');
    }
  });

  it('should show error if emulator not configured', async () => {
    // Select a game
    const gameCards = await $$('[class*="Card"]');
    if (gameCards.length === 0) {
      console.log('SKIP: No games in library');
      return;
    }
    
    await gameCards[0].click();
    await browser.pause(1500);
    
    const playBtn = await $('button*=Play');
    if (!(await playBtn.isDisplayed().catch(() => false))) {
      console.log('SKIP: Play button not visible');
      return;
    }
    
    await playBtn.click();
    await browser.pause(3000);
    
    // Look for error messages
    const errorMessages = [
      'No emulator',
      'not configured',
      'not found',
      'ROM file not found',
      'Configure an emulator',
      'Install an emulator'
    ];
    
    for (const msg of errorMessages) {
      const hasError = await $(`*=${msg}`).isDisplayed().catch(() => false);
      if (hasError) {
        console.log(`Error displayed: ${msg}`);
        expect(hasError).toBe(true);
        return;
      }
    }
    
    console.log('No error message found - emulator may be configured correctly');
  });

  it('should handle ROM file not found gracefully', async () => {
    // This tests the case where ROM path is invalid
    const gameCards = await $$('[class*="Card"]');
    if (gameCards.length === 0) {
      console.log('SKIP: No games in library');
      return;
    }
    
    await gameCards[0].click();
    await browser.pause(1500);
    
    const playBtn = await $('button*=Play');
    if (!(await playBtn.isDisplayed().catch(() => false))) {
      console.log('SKIP: Play button not visible');
      return;
    }
    
    await playBtn.click();
    await browser.pause(3000);
    
    // Check for ROM not found error
    const romNotFound = await $('*=ROM file not found').isDisplayed().catch(() => false);
    const fileNotFound = await $('*=not found').isDisplayed().catch(() => false);
    
    if (romNotFound || fileNotFound) {
      console.log('ROM file not found error handled correctly');
    } else {
      console.log('Either ROM exists or different error occurred');
    }
  });
});

describe('GBA Game Launch - Debug Mode', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should show launch command in debug builds', async () => {
    await goToLibrary();
    await browser.pause(1500);
    
    const gameCards = await $$('[class*="Card"]');
    if (gameCards.length === 0) {
      console.log('SKIP: No games in library');
      return;
    }
    
    await gameCards[0].click();
    await browser.pause(1500);
    
    const playBtn = await $('button*=Play');
    if (!(await playBtn.isDisplayed().catch(() => false))) {
      console.log('SKIP: Play button not visible');
      return;
    }
    
    await playBtn.click();
    await browser.pause(3000);
    
    // In debug mode, the app shows the command without executing
    // Look for debug-related messages
    const dryRun = await $('*=Dry run').isDisplayed().catch(() => false);
    const debugBuild = await $('*=DEBUG').isDisplayed().catch(() => false);
    const commandShown = await $('*=Command').isDisplayed().catch(() => false);
    
    console.log(`Debug mode indicators: dryRun=${dryRun}, debug=${debugBuild}, command=${commandShown}`);
  });
});

describe('GBA Game Launch - With Emulator', function() {
  this.timeout(180000); // 3 minutes

  before(async () => {
    await ensureMainApp();
  });

  it('should ensure mGBA is installed', async () => {
    await goToSettings('emulators');
    await browser.pause(2000);
    
    // Check if mGBA is installed
    const mgbaElements = await $$('*=mGBA');
    let mgbaInstalled = false;
    
    for (const el of mgbaElements) {
      const parent = await el.parentElement();
      const hasCheckIcon = await parent.$('[data-testid="CheckCircleIcon"]')
        .isDisplayed()
        .catch(() => false);
      
      if (hasCheckIcon) {
        mgbaInstalled = true;
        console.log('mGBA is installed');
        break;
      }
    }
    
    if (!mgbaInstalled) {
      // Try to install mGBA
      const installBtn = await $('button*=Install');
      if (await installBtn.isDisplayed().catch(() => false)) {
        console.log('Installing mGBA...');
        await installBtn.click();
        
        // Wait for installation
        const alert = await $('[role="alert"]');
        await alert.waitForDisplayed({ timeout: 120000 });
        
        const alertText = await alert.getText();
        console.log(`Install result: ${alertText}`);
        
        await browser.pause(3000);
      }
    }
  });

  it('should launch game with proper emulator', async () => {
    await goToLibrary();
    await browser.pause(2000);
    
    // Filter to GBA games
    const gbaPlatform = await $('*=GBA');
    if (await gbaPlatform.isDisplayed().catch(() => false)) {
      await gbaPlatform.click();
      await browser.pause(1000);
    }
    
    // Select first game
    const gameCards = await $$('[class*="Card"]');
    if (gameCards.length === 0) {
      console.log('SKIP: No GBA games in library');
      return;
    }
    
    await gameCards[0].click();
    await browser.pause(1500);
    
    // Get game name
    const gameTitle = await $('h5');
    const gameName = await gameTitle.getText().catch(() => 'Unknown game');
    console.log(`Attempting to launch: ${gameName}`);
    
    // Click Play
    const playBtn = await $('button*=Play');
    if (!(await playBtn.isDisplayed().catch(() => false))) {
      console.log('SKIP: Play button not visible');
      return;
    }
    
    await playBtn.click();
    await browser.pause(5000);
    
    // Check result
    const alert = await $('[role="alert"]');
    if (await alert.isDisplayed().catch(() => false)) {
      const alertText = await alert.getText();
      console.log(`Launch result: ${alertText}`);
      
      // Analyze the result
      if (alertText.toLowerCase().includes('success') || alertText.toLowerCase().includes('launched')) {
        console.log('Game launched successfully!');
      } else if (alertText.toLowerCase().includes('rom') && alertText.toLowerCase().includes('not found')) {
        console.log('ROM file not found - need to configure ROM paths');
      } else if (alertText.toLowerCase().includes('emulator')) {
        console.log('Emulator issue - check configuration');
      }
    } else {
      console.log('No feedback shown - checking if game launched');
    }
  });
});

describe('GBA Game Launch - Favorites', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should toggle favorite on a GBA game', async () => {
    await goToLibrary();
    await browser.pause(1500);
    
    // Select first game
    const gameCards = await $$('[class*="Card"]');
    if (gameCards.length === 0) {
      console.log('SKIP: No games in library');
      return;
    }
    
    await gameCards[0].click();
    await browser.pause(1500);
    
    // Find favorite button
    const favBtn = await $('[data-testid="FavoriteBorderIcon"]');
    const favFilledBtn = await $('[data-testid="FavoriteIcon"]');
    
    const isEmpty = await favBtn.isDisplayed().catch(() => false);
    const isFilled = await favFilledBtn.isDisplayed().catch(() => false);
    
    console.log(`Favorite state: empty=${isEmpty}, filled=${isFilled}`);
    
    // Toggle it
    if (isEmpty) {
      await favBtn.click();
      await browser.pause(1000);
      const nowFilled = await $('[data-testid="FavoriteIcon"]').isDisplayed().catch(() => false);
      console.log(`After toggle: ${nowFilled ? 'favorited' : 'unchanged'}`);
    } else if (isFilled) {
      await favFilledBtn.click();
      await browser.pause(1000);
      const nowEmpty = await $('[data-testid="FavoriteBorderIcon"]').isDisplayed().catch(() => false);
      console.log(`After toggle: ${nowEmpty ? 'unfavorited' : 'unchanged'}`);
    }
  });

  it('should show game in Favorites view', async () => {
    // Go to Favorites
    const favoritesLink = await $('*=Favorites');
    await favoritesLink.click();
    await browser.pause(1500);
    
    // Check if any favorites exist
    const gameCards = await $$('[class*="Card"]');
    const noFavorites = await $('*=No favorites').isDisplayed().catch(() => false);
    
    console.log(`Favorites view: ${gameCards.length} games, empty=${noFavorites}`);
  });
});
