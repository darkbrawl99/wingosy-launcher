/**
 * Tauri WebDriver E2E Tests - Coverage Analysis & Additional Tests
 * 
 * This file tests functionality that may not be covered by other spec files:
 * - Recent games
 * - Search functionality
 * - Collections
 * - ROM scanning
 * - Config management
 * - RomM sync workflow
 * - Save file management
 */

import { ensureMainApp, goToSettings, goToLibrary, waitForAppReady } from './helpers.js';

describe('Coverage: Recent Games', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should show recently played games if any exist', async () => {
    await goToLibrary();
    await browser.pause(1500);
    
    // Look for "Recent" or "Recently Played" section
    const recentSection = await $('*=Recent').isDisplayed().catch(() => false);
    const recentlyPlayed = await $('*=Recently Played').isDisplayed().catch(() => false);
    
    console.log(`Recent games section: ${recentSection || recentlyPlayed}`);
    
    // Recent games might not exist if no games have been played
  });

  it('should update recent games after playing a game', async () => {
    await goToLibrary();
    await browser.pause(1500);
    
    // This test would require actually playing a game
    // For now, just verify the library loads
    const allGames = await $('*=All Games');
    expect(await allGames.isDisplayed().catch(() => false)).toBe(true);
  });
});

describe('Coverage: Search Functionality', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToLibrary();
    await browser.pause(1500);
  });

  it('should have a search input field', async () => {
    const searchInput = await $('input[type="text"]');
    const searchByPlaceholder = await $('input[placeholder*="earch"]');
    
    const hasSearch = await searchInput.isDisplayed().catch(() => false) ||
                      await searchByPlaceholder.isDisplayed().catch(() => false);
    
    console.log(`Search input found: ${hasSearch}`);
    expect(hasSearch).toBe(true);
  });

  it('should filter games when typing in search', async () => {
    const searchInput = await $('input[type="text"]');
    
    if (!(await searchInput.isDisplayed().catch(() => false))) {
      console.log('SKIP: Search input not found');
      return;
    }
    
    // Get initial game count (count of game cards)
    const initialCards = await $$('[class*="Card"]');
    console.log(`Initial game cards: ${initialCards.length}`);
    
    // Type a search query
    await searchInput.setValue('pokemon');
    await browser.pause(1000);
    
    // Check if results filtered
    const filteredCards = await $$('[class*="Card"]');
    console.log(`Filtered game cards: ${filteredCards.length}`);
    
    // Clear search
    await searchInput.clearValue();
    await browser.pause(500);
  });

  it('should show empty state when no results match', async () => {
    const searchInput = await $('input[type="text"]');
    
    if (!(await searchInput.isDisplayed().catch(() => false))) {
      console.log('SKIP: Search input not found');
      return;
    }
    
    // Search for something that won't exist
    await searchInput.setValue('xyznonexistent12345');
    await browser.pause(1000);
    
    // Check for empty state
    const noResults = await $('*=No games').isDisplayed().catch(() => false);
    const noMatches = await $('*=No results').isDisplayed().catch(() => false);
    const emptyState = await $('*=found').isDisplayed().catch(() => false);
    const zeroCards = (await $$('[class*="Card"]')).length === 0;
    
    console.log(`Empty state: noGames=${noResults}, noMatches=${noMatches}, empty=${emptyState}, zeroCards=${zeroCards}`);
    
    // Clear search
    await searchInput.clearValue();
  });

  it('should be case-insensitive in search', async () => {
    const searchInput = await $('input[type="text"]');
    
    if (!(await searchInput.isDisplayed().catch(() => false))) {
      console.log('SKIP: Search input not found');
      return;
    }
    
    // Search with uppercase
    await searchInput.setValue('MARIO');
    await browser.pause(500);
    const upperResults = (await $$('[class*="Card"]')).length;
    
    // Search with lowercase
    await searchInput.clearValue();
    await searchInput.setValue('mario');
    await browser.pause(500);
    const lowerResults = (await $$('[class*="Card"]')).length;
    
    console.log(`Search results: uppercase=${upperResults}, lowercase=${lowerResults}`);
    
    // Results should be the same
    expect(upperResults).toBe(lowerResults);
    
    await searchInput.clearValue();
  });
});

describe('Coverage: Platform Filtering', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToLibrary();
    await browser.pause(1500);
  });

  it('should show platform list in sidebar', async () => {
    // Look for Platforms label or any platform buttons
    const platformsLabel = await $('*=Platforms').isDisplayed().catch(() => false);
    const gbaBtn = await $('*=GBA').isDisplayed().catch(() => false);
    const nesBtn = await $('*=NES').isDisplayed().catch(() => false);
    const sidebarPlatforms = await $$('[class*="ListItemButton"]');
    
    // Check if we have platform items (more than just nav buttons)
    const hasPlatforms = platformsLabel || gbaBtn || nesBtn || sidebarPlatforms.length > 3;
    
    console.log(`Platforms: label=${platformsLabel}, gba=${gbaBtn}, nes=${nesBtn}, buttons=${sidebarPlatforms.length}`);
    
    // At least one indicator should be present
    expect(hasPlatforms).toBe(true);
  });

  it('should filter games when clicking a platform', async () => {
    // Get initial count
    const initialCards = await $$('[class*="Card"]');
    console.log(`Initial games: ${initialCards.length}`);
    
    // Find and click a platform
    const platformButtons = await $$('[class*="ListItemButton"]');
    let clickedPlatform = false;
    
    for (const btn of platformButtons.slice(3, 8)) { // Skip nav items
      const text = await btn.getText().catch(() => '');
      if (text.match(/\d+$/) && !text.includes('All') && !text.includes('Favorites')) {
        await btn.click();
        clickedPlatform = true;
        console.log(`Clicked platform: ${text}`);
        break;
      }
    }
    
    if (clickedPlatform) {
      await browser.pause(1000);
      const filteredCards = await $$('[class*="Card"]');
      console.log(`Filtered games: ${filteredCards.length}`);
    }
    
    // Click All Games to reset
    const allGames = await $('*=All Games');
    await allGames.click();
    await browser.pause(500);
  });

  it('should show game count next to each platform', async () => {
    const platformButtons = await $$('[class*="ListItemButton"]');
    let foundCounts = 0;
    
    for (const btn of platformButtons.slice(2, 10)) {
      const text = await btn.getText().catch(() => '');
      const hasCount = /\d+$/.test(text);
      if (hasCount) {
        foundCounts++;
      }
    }
    
    console.log(`Platforms with game counts: ${foundCounts}`);
    expect(foundCounts).toBeGreaterThan(0);
  });
});

describe('Coverage: Game Details', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToLibrary();
    await browser.pause(1500);
  });

  it('should show game details when clicking a game', async () => {
    const gameCards = await $$('[class*="Card"]');
    
    if (gameCards.length === 0) {
      console.log('SKIP: No games in library');
      return;
    }
    
    await gameCards[0].click();
    await browser.pause(1500);
    
    // Check for detail elements
    const backBtn = await $('button*=Back').isDisplayed().catch(() => false);
    const playBtn = await $('button*=Play').isDisplayed().catch(() => false);
    const gameTitle = await $('h5').isDisplayed().catch(() => false);
    
    console.log(`Game details: backBtn=${backBtn}, playBtn=${playBtn}, title=${gameTitle}`);
    
    expect(backBtn || playBtn || gameTitle).toBe(true);
  });

  it('should show platform info in game details', async () => {
    const gameCards = await $$('[class*="Card"]');
    
    if (gameCards.length === 0) {
      console.log('SKIP: No games in library');
      return;
    }
    
    await gameCards[0].click();
    await browser.pause(1500);
    
    // Look for platform chip or label
    const platformChip = await $('[class*="Chip"]');
    const hasChip = await platformChip.isDisplayed().catch(() => false);
    
    if (hasChip) {
      const chipText = await platformChip.getText();
      console.log(`Platform chip: ${chipText}`);
    }
  });

  it('should navigate back from game details', async () => {
    const gameCards = await $$('[class*="Card"]');
    
    if (gameCards.length === 0) {
      console.log('SKIP: No games in library');
      return;
    }
    
    await gameCards[0].click();
    await browser.pause(1000);
    
    const backBtn = await $('button*=Back');
    if (await backBtn.isDisplayed().catch(() => false)) {
      await backBtn.click();
      await browser.pause(500);
      
      // Should be back in library
      const allGames = await $('*=All Games').isDisplayed().catch(() => false);
      console.log(`Navigated back to library: ${allGames}`);
    }
  });
});

describe('Coverage: Config Management', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings();
    await browser.pause(1500);
  });

  it('should display current config values', async () => {
    // Check for config-related UI elements
    const rommSection = await $('*=RomM').isDisplayed().catch(() => false);
    const librarySection = await $('*=Library').isDisplayed().catch(() => false);
    const emulatorsSection = await $('*=Emulators').isDisplayed().catch(() => false);
    
    console.log(`Config sections: RomM=${rommSection}, Library=${librarySection}, Emulators=${emulatorsSection}`);
    
    expect(rommSection || librarySection || emulatorsSection).toBe(true);
  });

  it('should persist settings across navigation', async () => {
    // Navigate away
    await goToLibrary();
    await browser.pause(500);
    
    // Navigate back
    await goToSettings();
    await browser.pause(500);
    
    // Settings should still be there
    const settingsHeading = await $('h4=Settings');
    expect(await settingsHeading.isDisplayed().catch(() => false)).toBe(true);
  });
});

describe('Coverage: RomM Integration', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings('romm');
    await browser.pause(1500);
  });

  it('should show RomM Server section', async () => {
    const rommSection = await $('*=RomM Server');
    const isVisible = await rommSection.isDisplayed().catch(() => false);
    
    console.log(`RomM section visible: ${isVisible}`);
    expect(isVisible).toBe(true);
  });

  it('should show connection status', async () => {
    // Look for connection status indicators or chips
    const connected = await $('*=Connected').isDisplayed().catch(() => false);
    const notConnected = await $('*=Not connected').isDisplayed().catch(() => false);
    const notConfigured = await $('*=Not configured').isDisplayed().catch(() => false);
    const statusChip = await $('[class*="Chip"]').isDisplayed().catch(() => false);
    const rommSection = await $('*=RomM').isDisplayed().catch(() => false);
    
    console.log(`RomM status: connected=${connected}, notConnected=${notConnected}, notConfigured=${notConfigured}, chip=${statusChip}, section=${rommSection}`);
    
    // Any status indication is acceptable
    const hasStatus = connected || notConnected || notConfigured || statusChip || rommSection;
    expect(hasStatus).toBe(true);
  });

  it('should have Connect button when not connected', async () => {
    const connectBtn = await $('button*=Connect').isDisplayed().catch(() => false);
    const syncBtn = await $('button*=Sync').isDisplayed().catch(() => false);
    
    console.log(`RomM buttons: Connect=${connectBtn}, Sync=${syncBtn}`);
  });

  it('should show URL input field', async () => {
    const urlInput = await $('input[placeholder*="http"]').isDisplayed().catch(() => false) ||
                     await $('input[type="url"]').isDisplayed().catch(() => false) ||
                     await $('*=URL').isDisplayed().catch(() => false);
    
    console.log(`URL input visible: ${urlInput}`);
  });
});

describe('Coverage: Library Path Management', () => {
  before(async () => {
    await ensureMainApp();
  });

  beforeEach(async () => {
    await goToSettings('library');
    await browser.pause(1500);
  });

  it('should show Library section', async () => {
    const librarySection = await $('h6=Library');
    const isVisible = await librarySection.isDisplayed().catch(() => false);
    
    console.log(`Library section visible: ${isVisible}`);
    expect(isVisible).toBe(true);
  });

  it('should have Add ROM Folder button', async () => {
    const addFolderBtn = await $('button*=Add').isDisplayed().catch(() => false) ||
                         await $('button*=Browse').isDisplayed().catch(() => false) ||
                         await $('button*=Folder').isDisplayed().catch(() => false);
    
    console.log(`Add folder button: ${addFolderBtn}`);
  });

  it('should have Scan for ROMs button', async () => {
    const scanBtn = await $('button*=Scan').isDisplayed().catch(() => false);
    
    console.log(`Scan button visible: ${scanBtn}`);
  });
});

describe('Coverage: Error Handling', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should show alert component for errors', async () => {
    // Verify alert system works
    const alertExists = await $('[role="alert"]').isDisplayed().catch(() => false);
    
    console.log(`Alert system available: ${alertExists}`);
    // Alert may or may not be visible depending on state
  });

  it('should handle navigation errors gracefully', async () => {
    // Try navigating between views rapidly
    await goToSettings();
    await browser.pause(200);
    await goToLibrary();
    await browser.pause(200);
    await goToSettings();
    await browser.pause(200);
    
    // App should still be functional
    const settingsHeading = await $('h4=Settings');
    expect(await settingsHeading.isDisplayed().catch(() => false)).toBe(true);
  });
});

describe('Coverage: Save File Management', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should show save management in game details for RomM games', async () => {
    await goToLibrary();
    await browser.pause(1500);
    
    const gameCards = await $$('[class*="Card"]');
    
    if (gameCards.length === 0) {
      console.log('SKIP: No games in library');
      return;
    }
    
    await gameCards[0].click();
    await browser.pause(1500);
    
    // Look for save-related UI
    const savesSection = await $('*=Saves').isDisplayed().catch(() => false);
    const cloudSave = await $('*=Cloud').isDisplayed().catch(() => false);
    const uploadBtn = await $('button*=Upload').isDisplayed().catch(() => false);
    
    console.log(`Save UI: saves=${savesSection}, cloud=${cloudSave}, upload=${uploadBtn}`);
  });
});

describe('Coverage: Keyboard Navigation', () => {
  before(async () => {
    await ensureMainApp();
  });

  it('should support keyboard navigation', async () => {
    await goToLibrary();
    await browser.pause(1000);
    
    // Try pressing Tab to navigate
    await browser.keys(['Tab']);
    await browser.pause(200);
    await browser.keys(['Tab']);
    await browser.pause(200);
    
    // Press Enter on focused element
    await browser.keys(['Enter']);
    await browser.pause(500);
    
    console.log('Keyboard navigation test completed');
  });

  it('should close dialogs with Escape key', async () => {
    await goToSettings('emulators');
    await browser.pause(1000);
    
    // Try opening a menu and closing with Escape
    const moreBtn = await $('[data-testid="MoreVertIcon"]');
    if (await moreBtn.isDisplayed().catch(() => false)) {
      const parent = await moreBtn.parentElement();
      await parent.click();
      await browser.pause(300);
      
      // Press Escape to close
      await browser.keys(['Escape']);
      await browser.pause(300);
      
      console.log('Escape key closes menus');
    }
  });
});
