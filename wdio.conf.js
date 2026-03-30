/**
 * WebdriverIO configuration for Tauri E2E testing
 * 
 * This tests the FULL Tauri app (Rust backend + React frontend) using:
 * - tauri-driver: Wraps the native WebDriver (must be started separately or via hook)
 * - msedgedriver: Microsoft Edge WebDriver (Windows)
 * 
 * Prerequisites:
 * 1. Install tauri-driver: cargo install tauri-driver
 * 2. Download EdgeDriver matching your Edge version from:
 *    https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/
 * 3. Place msedgedriver.exe in e2e-webdriver/ folder
 * 4. Build the app: npm run tauri build
 * 
 * Run tests:
 *   npm run test:e2e
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to the built Tauri app
const tauriAppPath = path.join(__dirname, 'src-tauri', 'target', 'release', 'Wingosy Launcher.exe');

// Path to EdgeDriver
const edgeDriverPath = path.join(__dirname, 'e2e-webdriver', 'msedgedriver.exe');

let tauriDriver;

export const config = {
  // Use local runner
  runner: 'local',
  
  // Test files - run in order: setup first, then core features
  specs: [
    './e2e-webdriver/setup-wizard.spec.js',
    './e2e-webdriver/app.spec.js',
    './e2e-webdriver/rom-download.spec.js',
    './e2e-webdriver/settings.spec.js',
    './e2e-webdriver/emulator-sensing.spec.js',
    './e2e-webdriver/emulator-download.spec.js',
    './e2e-webdriver/retroarch-cores.spec.js',
    './e2e-webdriver/game-launch.spec.js',
    './e2e-webdriver/game-launch-gba.spec.js',
    './e2e-webdriver/coverage-analysis.spec.js',
  ],
  
  // Exclude patterns
  exclude: [],
  
  // Max instances - must be 1 for Tauri (single app instance)
  maxInstances: 1,
  
  // Capabilities - connect to tauri-driver on port 4444
  capabilities: [{
    browserName: 'wry',
    'tauri:options': {
      application: tauriAppPath,
    },
  }],
  
  // Log level
  logLevel: 'info',
  
  // Bail after failures (0 = run all tests)
  bail: 0,
  
  // Base URL (not used for Tauri)
  baseUrl: '',
  
  // Default timeout for waitFor commands - increased significantly
  waitforTimeout: 30000,
  
  // Connection to tauri-driver
  hostname: 'localhost',
  port: 4444,
  path: '/',
  
  // Connection retry - increased
  connectionRetryTimeout: 180000,
  connectionRetryCount: 5,
  
  // Disable automatic driver management - we use tauri-driver
  automationProtocol: 'webdriver',
  
  // Framework
  framework: 'mocha',
  
  // Reporters
  reporters: ['spec'],
  
  // Mocha options
  mochaOpts: {
    ui: 'bdd',
    timeout: 300000, // 5 minutes for download tests
  },
  
  // Start tauri-driver before tests
  onPrepare: async function () {
    console.log('Starting tauri-driver with EdgeDriver...');
    console.log(`EdgeDriver path: ${edgeDriverPath}`);
    console.log(`App path: ${tauriAppPath}`);
    
    // Start tauri-driver pointing to msedgedriver
    tauriDriver = spawn('tauri-driver', ['--native-driver', edgeDriverPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    tauriDriver.stdout.on('data', (data) => {
      console.log(`[tauri-driver] ${data.toString().trim()}`);
    });
    
    tauriDriver.stderr.on('data', (data) => {
      console.error(`[tauri-driver stderr] ${data.toString().trim()}`);
    });
    
    tauriDriver.on('error', (err) => {
      console.error(`[tauri-driver] Failed to start: ${err.message}`);
    });
    
    tauriDriver.on('close', (code) => {
      console.log(`[tauri-driver] Exited with code ${code}`);
    });
    
    // Wait longer for tauri-driver to start
    console.log('Waiting for tauri-driver to start (5 seconds)...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('tauri-driver should be ready');
  },
  
  // Stop tauri-driver after tests
  onComplete: async function () {
    console.log('Stopping tauri-driver...');
    if (tauriDriver) {
      tauriDriver.kill('SIGTERM');
      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  },
  
  // Before test suite - wait for app to fully load
  before: async function () {
    console.log('Waiting for app to initialize (5 seconds)...');
    await browser.pause(5000);
    
    // Check all available windows/handles
    try {
      const handles = await browser.getWindowHandles();
      console.log(`Available window handles: ${handles.length}`);
      for (const handle of handles) {
        console.log(`  Handle: ${handle}`);
      }
      
      // If more than one window, try switching
      if (handles.length > 1) {
        console.log('Multiple windows found, trying to switch...');
        for (const handle of handles) {
          await browser.switchToWindow(handle);
          const url = await browser.getUrl().catch(() => 'unknown');
          console.log(`  Window ${handle}: URL = ${url}`);
          if (url !== 'about:blank') {
            console.log(`Found non-blank window: ${handle}`);
            break;
          }
        }
      }
    } catch (err) {
      console.log(`Error getting window handles: ${err.message}`);
    }
    
    // Check current URL
    let url = await browser.getUrl().catch(() => 'unknown');
    console.log(`Current URL: ${url}`);
    
    // If still on about:blank, try to navigate to tauri protocol
    if (url === 'about:blank') {
      // Try multiple tauri URL formats
      const tauriUrls = [
        'tauri://localhost',
        'https://tauri.localhost',
        'http://tauri.localhost',
        'wry://localhost'
      ];
      
      for (const tauriUrl of tauriUrls) {
        console.log(`Trying to navigate to ${tauriUrl}...`);
        try {
          await browser.url(tauriUrl);
          await browser.pause(3000);
          url = await browser.getUrl().catch(() => 'unknown');
          console.log(`After ${tauriUrl}: URL = ${url}`);
          if (url !== 'about:blank') {
            console.log('Successfully navigated!');
            break;
          }
        } catch (err) {
          console.log(`  Failed: ${err.message}`);
        }
      }
    }
    
    // Now try to wait for the app content to load
    console.log('Checking if app content is loaded...');
    
    // Retry checking for app content up to 30 seconds
    let attempts = 0;
    const maxAttempts = 30;
    let appLoaded = false;
    
    while (attempts < maxAttempts && !appLoaded) {
      attempts++;
      
      try {
        // Try to find any element that indicates the app is loaded
        // Could be "Wingosy" title, "Get Started" button, or "All Games"
        const wingosy = await $('*=Wingosy');
        const getStarted = await $('button*=Get Started');
        const allGames = await $('*=All Games');
        
        const hasWingosy = await wingosy.isDisplayed().catch(() => false);
        const hasGetStarted = await getStarted.isDisplayed().catch(() => false);
        const hasAllGames = await allGames.isDisplayed().catch(() => false);
        
        if (hasWingosy || hasGetStarted || hasAllGames) {
          appLoaded = true;
          console.log(`App loaded after ${attempts} seconds! (Wingosy: ${hasWingosy}, GetStarted: ${hasGetStarted}, AllGames: ${hasAllGames})`);
        } else {
          // Check page source to see what's happening
          if (attempts % 5 === 0) {
            const currentUrl = await browser.getUrl().catch(() => 'unknown');
            console.log(`Attempt ${attempts}: App not ready yet. URL: ${currentUrl}`);
          }
          await browser.pause(1000);
        }
      } catch (err) {
        if (attempts % 5 === 0) {
          console.log(`Attempt ${attempts}: Error checking app state: ${err.message}`);
        }
        await browser.pause(1000);
      }
    }
    
    if (!appLoaded) {
      console.log('WARNING: App may not be fully loaded after 30 attempts');
      // Try to get page source for debugging
      try {
        const source = await browser.getPageSource();
        console.log(`Page source length: ${source.length}`);
        console.log(`Page source preview: ${source.substring(0, 500)}`);
      } catch (err) {
        console.log(`Could not get page source: ${err.message}`);
      }
    }
  },
  
  // After each test
  afterTest: async function (test, context, { error, passed }) {
    if (!passed) {
      console.log(`Test failed: ${test.title}`);
    }
    // Small pause between tests to let UI settle
    await browser.pause(500);
  },
};
