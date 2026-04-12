/**
 * Shared test helpers for E2E tests
 */

/**
 * Navigate to the Tauri app URL if on about:blank
 * This is needed because tauri-driver initially shows about:blank
 */
export async function navigateToApp() {
  const url = await browser.getUrl().catch(() => 'unknown');
  if (url === 'about:blank') {
    console.log('[Helper] On about:blank, navigating to https://tauri.localhost...');
    await browser.url('https://tauri.localhost');
    await browser.pause(2000);
    const newUrl = await browser.getUrl().catch(() => 'unknown');
    console.log(`[Helper] New URL: ${newUrl}`);
    return newUrl !== 'about:blank';
  }
  return true;
}

/**
 * Wait for the app to be fully loaded (past blank screen)
 * Returns true if app is ready, false otherwise
 */
export async function waitForAppReady(maxWaitSeconds = 30) {
  console.log(`[Helper] Waiting up to ${maxWaitSeconds}s for app to load...`);
  
  // First ensure we're not on about:blank
  await navigateToApp();
  
  for (let i = 0; i < maxWaitSeconds; i++) {
    try {
      // Check for any indicator that the app is loaded
      const wingosy = await $('*=Wingosy');
      const getStarted = await $('button*=Get Started');
      const allGames = await $('*=All Games');
      const settings = await $('*=Settings');
      
      const hasWingosy = await wingosy.isDisplayed().catch(() => false);
      const hasGetStarted = await getStarted.isDisplayed().catch(() => false);
      const hasAllGames = await allGames.isDisplayed().catch(() => false);
      const hasSettings = await settings.isDisplayed().catch(() => false);
      
      if (hasWingosy || hasGetStarted || hasAllGames || hasSettings) {
        console.log(`[Helper] App ready after ${i + 1}s`);
        return true;
      }
    } catch {
      // Ignore errors during wait
    }
    
    await browser.pause(1000);
  }
  
  console.log(`[Helper] App not ready after ${maxWaitSeconds}s`);
  return false;
}

/**
 * Ensures app is past setup wizard.
 * Completes setup if needed, or verifies already in main app.
 */
export async function ensureMainApp() {
  // First wait for any content to appear
  await waitForAppReady(30);

  // Desktop sidebar says "All Games"; immersive shell does not — leave immersive first
  let allGames = await $('*=All Games');
  if (!(await allGames.isDisplayed().catch(() => false))) {
    const immersiveLib = await $('[data-testid="immersive-library"]');
    if (await immersiveLib.isDisplayed().catch(() => false)) {
      console.log('[Helper] Immersive mode detected, switching to desktop');
      await ensureDesktopMode();
    }
  }

  // Check if already in main app
  allGames = await $('*=All Games');
  if (await allGames.isDisplayed().catch(() => false)) {
    console.log('[Helper] Already in main app');
    return true;
  }
  
  // May need to complete setup wizard
  const getStarted = await $('button*=Get Started');
  if (await getStarted.isDisplayed().catch(() => false)) {
    console.log('[Helper] Completing setup wizard...');
    
    // Step 0: Get Started
    await getStarted.click();
    await browser.pause(2000);
    
    // Step 1: Skip RomM
    let skipBtn = await $('button*=Skip');
    if (await skipBtn.isDisplayed().catch(() => false)) {
      await skipBtn.click();
      await browser.pause(2000);
    }
    
    // Step 2: Skip ROM Folder
    skipBtn = await $('button*=Skip');
    if (await skipBtn.isDisplayed().catch(() => false)) {
      await skipBtn.click();
      await browser.pause(2000);
    }
    
    // Step 3: Skip/Finish Scan
    skipBtn = await $('button*=Skip');
    const finishBtn = await $('button*=Finish');
    if (await finishBtn.isDisplayed().catch(() => false)) {
      await finishBtn.click();
    } else if (await skipBtn.isDisplayed().catch(() => false)) {
      await skipBtn.click();
    }
    
    await browser.pause(3000);
    console.log('[Helper] Setup wizard completed');
  }
  
  // Wait a bit more for main app to render
  await browser.pause(2000);
  
  // Verify we're in main app now
  const mainApp = await $('*=All Games').isDisplayed().catch(() => false);
  console.log(`[Helper] In main app: ${mainApp}`);
  return mainApp;
}

/**
 * Navigate to Settings page.
 * @param {string} [sectionId] - Optional sidebar section: general | appearance | sound | romm | library | emulators | integrations | updates
 */
export async function goToSettings(sectionId) {
  await ensureMainApp();
  
  const settingsBtn = await $('*=Settings');
  
  // Wait for settings button with retry
  for (let i = 0; i < 10; i++) {
    if (await settingsBtn.isDisplayed().catch(() => false)) {
      break;
    }
    await browser.pause(1000);
  }
  
  await settingsBtn.click();
  await browser.pause(2000);
  
  // Verify we're in settings
  const heading = await $('h4=Settings');
  const ok = await heading.isDisplayed().catch(() => false);
  if (sectionId && ok) {
    const nav = await $(`[data-testid="settings-nav-${sectionId}"]`);
    if (await nav.isDisplayed().catch(() => false)) {
      await nav.click();
      await browser.pause(400);
    }
  }
  return ok;
}

/**
 * Navigate to Library (All Games)
 */
/**
 * Leave Immersive mode when the immersive chrome is showing (library or after backing out of in-shell Settings).
 */
export async function ensureDesktopMode() {
  await navigateToApp();
  for (let step = 0; step < 4; step++) {
    const exitImmersive = await $('[data-testid="immersive-exit-to-desktop"]');
    if (await exitImmersive.isDisplayed().catch(() => false)) {
      await exitImmersive.click();
      await browser.pause(2500);
      return;
    }
    const immersiveLib = await $('[data-testid="immersive-library"]');
    const settingsHeading = await $('h4=Settings');
    const backBtn = await $('button*=Back');
    const onSettings = await settingsHeading.isDisplayed().catch(() => false);
    const libraryVisible = await immersiveLib.isDisplayed().catch(() => false);
    if (onSettings && !libraryVisible && (await backBtn.isDisplayed().catch(() => false))) {
      await backBtn.click();
      await browser.pause(1500);
      continue;
    }
    break;
  }
}

export async function goToLibrary() {
  await ensureMainApp();
  
  const allGamesBtn = await $('*=All Games');
  
  // Wait for button with retry
  for (let i = 0; i < 10; i++) {
    if (await allGamesBtn.isDisplayed().catch(() => false)) {
      break;
    }
    await browser.pause(1000);
  }
  
  await allGamesBtn.click();
  await browser.pause(1000);
  
  return true;
}

/**
 * Wait for an element with retry
 */
export async function waitForElement(selector, timeout = 10000) {
  const element = await $(selector);
  try {
    await expect(element).toBeDisplayed({ timeout });
    return element;
  } catch {
    return null;
  }
}

/**
 * Get page diagnostic info for debugging
 */
export async function getPageDiagnostics() {
  try {
    const url = await browser.getUrl().catch(() => 'unknown');
    const title = await browser.getTitle().catch(() => 'unknown');
    const source = await browser.getPageSource().catch(() => '');
    
    return {
      url,
      title,
      sourceLength: source.length,
      sourcePreview: source.substring(0, 500),
    };
  } catch (err) {
    return { error: err.message };
  }
}
