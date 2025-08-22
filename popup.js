const TMDB_API_KEY = "1e1f168db982c93aa1d735edee1ae51f";

let movieTitleDiv, recommendationsDiv, searchInput, debugDiv;

// Debug logging
function debugLog(message) {
    console.log(message);
    if (debugDiv) {
        debugDiv.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
        debugDiv.style.display = 'block';
    }
}

// Check if we're running in extension context
function checkExtensionContext() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
        debugLog('❌ Chrome extension context not available');
        showError('Extension not loaded properly. Please reload the extension.');
        return false;
    }
    debugLog('✅ Chrome extension context available');
    return true;
}

// Show error message
function showError(message) {
    if (movieTitleDiv) {
        movieTitleDiv.innerHTML = `
            <div class="error">
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <div>${message}</div>
            </div>
        `;
    }
}

// Show no movie selected state
function showNoMovie() {
    if (movieTitleDiv) {
        movieTitleDiv.innerHTML = `
            <div class="no-movie">
                <div style="font-size: 32px; margin-bottom: 15px;">🎬</div>
                <div style="font-size: 16px; margin-bottom: 10px;">No movie selected</div>
                <div class="instructions">
                    1. Go to any webpage<br>
                    2. Highlight a movie title<br>
                    3. Right-click → "🎬 Find Similar Movies"
                </div>
            </div>
        `;
    }
}

// Make API request with error handling
async function makeApiRequest(url) {
    debugLog(`Making API request to: ${url.substring(0, 50)}...`);
    
    try {
        const response = await fetch(url);
        debugLog(`API response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        debugLog(`API response: ${data.results?.length || 0} results`);
        return data;
    } catch (error) {
        debugLog(`❌ API request failed: ${error.message}`);
        throw error;
    }
}

// Open TMDb page for movie
function openTMDbPage(movieId) {
    if (chrome.tabs) {
        chrome.tabs.create({
            url: `https://www.themoviedb.org/movie/${movieId}`
        });
    } else {
        window.open(`https://www.themoviedb.org/movie/${movieId}`, '_blank');
    }
}

// Handle movie card clicks
function handleMovieCardClick(event) {
    const card = event.currentTarget;
    const movieId = card.getAttribute('data-movie-id');
    if (movieId) {
        openTMDbPage(movieId);
    }
}

// Search for movie and get recommendations
async function searchMovie(movieTitle) {
    debugLog(`Searching for movie: "${movieTitle}"`);
    
    if (movieTitleDiv) {
        movieTitleDiv.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <span>Searching for "${movieTitle}"...</span>
            </div>
        `;
    }

    try {
        // Search for the movie
        const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`;
        const searchData = await makeApiRequest(searchUrl);

        if (!searchData.results || searchData.results.length === 0) {
            showError(`No movies found for "${movieTitle}"`);
            return;
        }

        const movie = searchData.results[0];
        const year = movie.release_date ? movie.release_date.slice(0, 4) : "N/A";
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";

        if (movieTitleDiv) {
            movieTitleDiv.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">${movie.title}</div>
                    <div style="font-size: 12px; opacity: 0.8;">${year} • ⭐ ${rating}</div>
                </div>
            `;

            // Show loading for recommendations
            movieTitleDiv.innerHTML += `
                <div class="loading" style="margin-top: 10px;">
                    <div class="spinner"></div>
                    <span style="font-size: 12px;">Finding similar movies...</span>
                </div>
            `;
        }

        const similarUrl = `https://api.themoviedb.org/3/movie/${movie.id}/similar?api_key=${TMDB_API_KEY}`;
        const similarData = await makeApiRequest(similarUrl);

        // Remove loading message
        if (movieTitleDiv) {
            movieTitleDiv.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 5px;">${movie.title}</div>
                    <div style="font-size: 12px; opacity: 0.8;">${year} • ⭐ ${rating}</div>
                </div>
            `;
        }

        if (!similarData.results || similarData.results.length === 0) {
            if (recommendationsDiv) {
                recommendationsDiv.innerHTML = `
                    <div style="text-align: center; padding: 20px; opacity: 0.7;">
                        <div style="font-size: 24px; margin-bottom: 10px;">🎭</div>
                        <div>No similar movies found</div>
                    </div>
                `;
            }
            return;
        }

        // Display recommendations
        const movies = similarData.results.slice(0, 5); // Show top 5
        if (recommendationsDiv) {
            recommendationsDiv.innerHTML = movies.map(movie => {
                const year = movie.release_date ? movie.release_date.slice(0, 4) : "N/A";
                const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
                const posterUrl = movie.poster_path 
                    ? `https://image.tmdb.org/t/p/w200${movie.poster_path}`
                    : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNzUiIHZpZXdCb3g9IjAgMCA1MCA3NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9Ijc1IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KPHN2ZyB4PSIxNSIgeT0iMjciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC41Ij4KPHBhdGggZD0iTTkgMTJsMy4xNCAwIDAtNEwxOCA0bC00IDQgMCA0eiIvPgo8L3N2Zz4KPC9zdmc+';

                return `
                    <div class="movie-card" data-movie-id="${movie.id}">
                        <img src="${posterUrl}" alt="${movie.title}" class="movie-poster" />
                        <div class="movie-info">
                            <h3>${movie.title}</h3>
                            <p>${year} • ⭐ ${rating}</p>
                        </div>
                    </div>
                `;
            }).join('');

            // Add click listeners to movie cards
            const movieCards = recommendationsDiv.querySelectorAll('.movie-card');
            movieCards.forEach(card => {
                card.addEventListener('click', handleMovieCardClick);
            });
        }

        debugLog(`✅ Successfully loaded ${movies.length} recommendations`);

    } catch (error) {
        debugLog(`❌ Error in searchMovie: ${error.message}`);
        showError(`Error: ${error.message}`);
    }
}

// Handle search input
let searchTimeout;
function handleSearchInput(e) {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    if (query.length > 2) {
        searchTimeout = setTimeout(() => {
            searchMovie(query);
        }, 1000);
    }
}

// Initialize when DOM is loaded
function initializePopup() {
    debugLog('🚀 ReelMate popup loaded');
    
    // Get DOM elements
    movieTitleDiv = document.getElementById("movie-title");
    recommendationsDiv = document.getElementById("recommendations");
    searchInput = document.getElementById("search-input");
    debugDiv = document.getElementById("debug");
    
    // Check if extension context is available
    if (!checkExtensionContext()) {
        return;
    }

    // Check API key
    if (TMDB_API_KEY === "YOUR_API_KEY_HERE") {
        showError('Please update your TMDb API key in the popup.js file');
        return;
    }

    // Add event listener to search input
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }

    // Get selected movie from storage
    try {
        chrome.storage.local.get("selectedMovie", (result) => {
            if (chrome.runtime.lastError) {
                debugLog(`❌ Storage error: ${chrome.runtime.lastError.message}`);
                showError('Storage access error. Please reload the extension.');
                return;
            }

            const movieTitle = result.selectedMovie;
            debugLog(`Selected movie from storage: "${movieTitle || 'none'}"`);

            if (!movieTitle) {
                showNoMovie();
                return;
            }

            searchMovie(movieTitle);
        });
    } catch (error) {
        debugLog(`❌ Critical error: ${error.message}`);
        showError('Extension error. Please reload.');
    }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopup);
} else {
    initializePopup();
}