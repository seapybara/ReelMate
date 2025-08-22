// Enhanced background.js with better movie detection and user experience

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for selected text
  chrome.contextMenus.create({
    id: "findSimilarMovies",
    title: "🎬 Find Similar Movies",
    contexts: ["selection"]
  });

  // Create context menu for any page (when no text is selected)
  chrome.contextMenus.create({
    id: "openReelMate",
    title: "🎞️ Open ReelMate",
    contexts: ["page"]
  });

  // Create context menu specifically for IMDb and other movie sites
  chrome.contextMenus.create({
    id: "findSimilarFromPage",
    title: "🎭 Find Similar to This Movie",
    contexts: ["page"],
    documentUrlPatterns: [
      "*://*.imdb.com/title/*",
      "*://*.themoviedb.org/movie/*",
      "*://*.rottentomatoes.com/m/*",
      "*://*.letterboxd.com/film/*"
    ]
  });
});

// Enhanced movie title detection and cleanup
function cleanMovieTitle(title) {
  if (!title) return '';
  
  return title
    // Remove common prefixes/suffixes
    .replace(/^(Watch\s+|Stream\s+|Download\s+)/i, '')
    .replace(/\s+(Online|Free|HD|4K|Movie|Film)$/i, '')
    
    // Remove year in parentheses at the end
    .replace(/\s*\(\d{4}\)$/, '')
    
    // Remove special characters that might interfere with search
    .replace(/["""'']/g, '"')
    .replace(/[–—]/g, '-')
    
    // Remove extra whitespace
    .trim()
    .replace(/\s+/g, ' ');
}

// Detect movie title from page content for specific sites
async function detectMovieFromPage(tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const url = window.location.href;
        let title = '';

        if (url.includes('imdb.com/title/')) {
          // IMDb detection
          const titleElement = document.querySelector('h1[data-testid="hero__pageTitle"] span, .title_wrapper h1, .originalTitle');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }
        } else if (url.includes('themoviedb.org/movie/')) {
          // TMDb detection
          const titleElement = document.querySelector('h2 a, .title h2, section.header h2');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }
        } else if (url.includes('rottentomatoes.com/m/')) {
          // Rotten Tomatoes detection
          const titleElement = document.querySelector('h1[data-qa="score-panel-movie-title"], .movieTitle, h1.movie-title');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }
        } else if (url.includes('letterboxd.com/film/')) {
          // Letterboxd detection
          const titleElement = document.querySelector('.film-title-wrapper h1, .headline-1');
          if (titleElement) {
            title = titleElement.textContent.trim();
          }
        }

        return title;
      }
    });

    return results && results[0] && results[0].result ? results[0].result : '';
  } catch (error) {
    console.error('Error detecting movie from page:', error);
    return '';
  }
}

// Store recent searches for better user experience
async function addToRecentSearches(movieTitle) {
  try {
    const result = await chrome.storage.local.get('recentSearches');
    let recent = result.recentSearches || [];
    
    // Remove if already exists to avoid duplicates
    recent = recent.filter(title => title.toLowerCase() !== movieTitle.toLowerCase());
    
    // Add to beginning
    recent.unshift(movieTitle);
    
    // Keep only last 10 searches
    recent = recent.slice(0, 10);
    
    await chrome.storage.local.set({ recentSearches: recent });
  } catch (error) {
    console.error('Error saving recent searches:', error);
  }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    let movieTitle = '';

    if (info.menuItemId === "findSimilarMovies" && info.selectionText) {
      // Clean the selected text
      movieTitle = cleanMovieTitle(info.selectionText);
      
    } else if (info.menuItemId === "findSimilarFromPage") {
      // Try to detect movie title from the current page
      movieTitle = await detectMovieFromPage(tab);
      
    } else if (info.menuItemId === "openReelMate") {
      // Just open ReelMate without a specific movie
      movieTitle = '';
    }

    // Store the movie title and add to recent searches
    await chrome.storage.local.set({ selectedMovie: movieTitle });
    
    if (movieTitle) {
      await addToRecentSearches(movieTitle);
    }

    // Optional: Show a brief notification
    if (movieTitle) {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
      
      // Clear badge after 3 seconds
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 3000);
    }

  } catch (error) {
    console.error('Error handling context menu click:', error);
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "searchMovie") {
    // Handle search requests from popup
    chrome.storage.local.set({ selectedMovie: cleanMovieTitle(request.title) });
    addToRecentSearches(request.title);
    sendResponse({ success: true });
  } else if (request.action === "getRecentSearches") {
    // Return recent searches
    chrome.storage.local.get('recentSearches', (result) => {
      sendResponse({ searches: result.recentSearches || [] });
    });
    return true; // Indicate async response
  }
});

// Clear badge when popup is opened
chrome.action.onClicked.addListener(() => {
  chrome.action.setBadgeText({ text: "" });
});

// Auto-cleanup old data (run when extension starts)
chrome.runtime.onStartup.addListener(() => {
  // Clear old selected movie if it's been more than 1 hour
  chrome.storage.local.get(['selectedMovie', 'lastSearchTime'], (result) => {
    const now = Date.now();
    const lastSearch = result.lastSearchTime || 0;
    const oneHour = 60 * 60 * 1000;

    if (now - lastSearch > oneHour) {
      chrome.storage.local.remove('selectedMovie');
    }
  });
});

// Update timestamp when movie is selected
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.selectedMovie) {
    chrome.storage.local.set({ lastSearchTime: Date.now() });
  }
});