const TMDB_API_KEY = "1e1f168db982c93aa1d735edee1ae51f"; 

const movieTitleDiv = document.getElementById("movie-title");
const recommendationsDiv = document.getElementById("recommendations");

chrome.storage.local.get("selectedMovie", async (result) => {
  const movieTitle = result.selectedMovie;

  if (!movieTitle) {
    movieTitleDiv.textContent = 'No movie title selected.';
    return;
  }

  movieTitleDiv.textContent = `You selected: "${movieTitle}"`;

  try {
    // Search for the movie
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(movieTitle)}`
    );
    const searchData = await searchRes.json();
    const movieId = searchData.results[0]?.id;

    if (!movieId) {
      recommendationsDiv.textContent = "No similar movies found.";
      return;
    }

    // Get recommendations
    const recRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/similar?api_key=${TMDB_API_KEY}`
    );
    const recData = await recRes.json();

    if (!recData.results.length) {
      recommendationsDiv.textContent = "No similar movies found.";
      return;
    }

    // Display the top 3 results
    recommendationsDiv.innerHTML = recData.results.slice(0, 3).map(movie => `
      <div class="movie">
        <img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}" />
        <p><strong>${movie.title}</strong> (${movie.release_date?.slice(0, 4) || "N/A"})</p>
      </div>
    `).join("");

  } catch (error) {
    console.error("Error fetching data from TMDB:", error);
    recommendationsDiv.textContent = "Something went wrong. Please try again.";
  }
});