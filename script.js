// Spotify API Configuration
const CLIENT_ID = '22aa1a7303fa47dd99e3a35c4e1fff73'; // Your Spotify Client ID
const REDIRECT_URI = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://yeezer.netlify.app'; // Replace this with your actual Netlify URL

console.log('Current hostname:', window.location.hostname);
console.log('Using redirect URI:', REDIRECT_URI);

const SCOPES = 'user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state';

let accessToken = null;
let songs = [];
let playedSongs = []; // Track played songs
let currentSong = null;
let score = 0;
let options = [];
let correctAnswer = null;
let currentRound = 1;
const TOTAL_ROUNDS = 10;

// Timer variables
let startTime = null;
let timerInterval = null;
let elapsedTime = 0;

// Spotify Web Playback SDK
let player;
let deviceId;
let isPlayerReady = false;

// DOM elements
const playPauseButton = document.getElementById('play-pause');
const stopButton = document.getElementById('stop');
const optionsContainer = document.getElementById('options');
const scoreElement = document.getElementById('score');
const nextButton = document.getElementById('next-song');
const progressBar = document.getElementById('progress-bar');
const roundDisplay = document.getElementById('round');
const timerDisplay = document.getElementById('timer');
const leaderboardList = document.getElementById('leaderboard-list');

// Timer functions
function startTimer() {
    if (!startTime) {
        startTime = Date.now();
        timerInterval = setInterval(updateTimer, 1000);
    }
}

function updateTimer() {
    elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Leaderboard functions
function saveToLeaderboard(score, time) {
    let leaderboard = JSON.parse(localStorage.getItem('yeezer_leaderboard') || '[]');
    
    // Add new score
    leaderboard.push({
        score: score,
        time: time,
        date: new Date().toISOString()
    });
    
    // Sort by score (descending) and time (ascending)
    leaderboard.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.time - b.time;
    });
    
    // Keep only top 10 scores
    leaderboard = leaderboard.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('yeezer_leaderboard', JSON.stringify(leaderboard));
    
    // Update display
    displayLeaderboard();
}

function displayLeaderboard() {
    const leaderboard = JSON.parse(localStorage.getItem('yeezer_leaderboard') || '[]');
    leaderboardList.innerHTML = '';
    
    leaderboard.forEach((entry, index) => {
        const minutes = Math.floor(entry.time / 60);
        const seconds = entry.time % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const li = document.createElement('li');
        li.textContent = `${index + 1}. Score: ${entry.score}% | Time: ${timeString}`;
        leaderboardList.appendChild(li);
    });
}

// Initialize Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = () => {
    console.log('Spotify Web Playback SDK is ready');
    player = new Spotify.Player({
        name: 'YEEZER Game',
        getOAuthToken: cb => cb(accessToken),
        volume: 0.5
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize:', message);
        isPlayerReady = false;
    });

    player.addListener('authentication_error', ({ message }) => {
        console.error('Failed to authenticate:', message);
        isPlayerReady = false;
    });

    player.addListener('account_error', ({ message }) => {
        console.error('Failed to validate Spotify account:', message);
        isPlayerReady = false;
    });

    player.addListener('playback_error', ({ message }) => {
        console.error('Failed to perform playback:', message);
    });

    // Playback status updates
    player.addListener('player_state_changed', state => {
        if (state) {
            console.log('Player state changed:', state);
            updatePlayPauseButton(state.paused);
        }
    });

    // Ready
    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        deviceId = device_id;
        isPlayerReady = true;
        playPauseButton.disabled = false;
        stopButton.disabled = false;
        
        // If we have songs loaded, try to play the current song
        if (currentSong) {
            playSong(currentSong.id);
        }
    });

    // Connect to the player
    player.connect();
};

// Initialize game
async function initGame() {
    try {
        // Display leaderboard at start
        displayLeaderboard();
        
        // Check if we have a token in localStorage first
        const savedToken = localStorage.getItem('spotify_token');
        if (savedToken) {
            console.log('Found saved token');
            accessToken = savedToken;
            await loadKanyeSongs();
            loadNewSong();
            updateScore();
            updateProgress();
            return;
        }

        // Check if we have a token in the URL
        const hash = window.location.hash
            .substring(1)
            .split('&')
            .reduce((initial, item) => {
                if (item) {
                    const parts = item.split('=');
                    initial[parts[0]] = decodeURIComponent(parts[1]);
                }
                return initial;
            }, {});

        if (hash.access_token) {
            accessToken = hash.access_token;
            // Save token to localStorage
            localStorage.setItem('spotify_token', accessToken);
            window.location.hash = '';
            console.log('Got new access token:', accessToken);
            await loadKanyeSongs();
            loadNewSong();
            updateScore();
            updateProgress();
        } else {
            // If no token, redirect to Spotify login
            console.log('No access token, redirecting to Spotify login...');
            window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
        }
    } catch (error) {
        console.error('Error in initGame:', error);
        alert('Error initializing game. Please check the console for details.');
    }
}

// Load Kanye West's songs from Spotify
async function loadKanyeSongs() {
    try {
        console.log('Loading Kanye songs...');
        
        if (!accessToken) {
            throw new Error('No access token available');
        }

        // First, get all of Kanye's albums
        const albumsResponse = await fetch('https://api.spotify.com/v1/artists/5K4W6rqBFWDnAN6FQUkS6x/albums?limit=50&include_groups=album,single', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!albumsResponse.ok) {
            const errorData = await albumsResponse.json();
            console.error('Spotify API Error:', errorData);
            
            if (albumsResponse.status === 401) {
                localStorage.removeItem('spotify_token');
                window.location.reload();
            }
            
            throw new Error(`HTTP error! status: ${albumsResponse.status}`);
        }

        const albumsData = await albumsResponse.json();
        console.log('Got albums:', albumsData);

        // Get tracks from each album
        songs = [];
        for (const album of albumsData.items) {
            const tracksResponse = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (tracksResponse.ok) {
                const tracksData = await tracksResponse.json();
                const albumTracks = tracksData.items.map(track => ({
                    title: track.name,
                    id: track.id,
                    album: album.name,
                    artist: track.artists[0].name
                }));
                songs = songs.concat(albumTracks);
            }
        }

        // Remove duplicates based on track ID
        songs = Array.from(new Map(songs.map(song => [song.id, song])).values());
        
        console.log(`Loaded ${songs.length} unique songs:`, songs);
        
        if (songs.length === 0) {
            throw new Error('No songs found!');
        }
    } catch (error) {
        console.error('Error loading songs:', error);
        alert('Error loading songs. Please check the console for details.');
    }
}

// Load a new random song
async function loadNewSong() {
    try {
        if (songs.length === 0) {
            throw new Error('No songs available!');
        }

        // Reset previous state
        optionsContainer.innerHTML = '';
        nextButton.disabled = true;
        playPauseButton.disabled = true;
        stopButton.disabled = true;
        
        // Start timer on first song
        if (currentRound === 1) {
            startTimer();
        }
        
        // Select random song that hasn't been played yet
        let availableSongs = songs.filter(song => !playedSongs.includes(song.id));
        
        // If all songs have been played, reset the played songs list
        if (availableSongs.length === 0) {
            console.log('All songs have been played, resetting played songs list');
            playedSongs = [];
            availableSongs = songs;
        }
        
        currentSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
        console.log('Selected song:', currentSong);
        
        // Add current song to played songs list
        playedSongs.push(currentSong.id);
        
        // Generate options
        generateOptions();
        
        // Update progress
        updateProgress();
        
        // Check if game is over
        if (currentRound > TOTAL_ROUNDS) {
            endGame();
            return;
        }

        // Only try to play if the player is ready
        if (isPlayerReady && deviceId) {
            await playSong(currentSong.id);
            playPauseButton.disabled = false;
            stopButton.disabled = false;
        } else {
            console.log('Waiting for Spotify player to initialize...');
            // The song will be played when the player is ready (handled in the ready listener)
        }
    } catch (error) {
        console.error('Error loading new song:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            currentSong: currentSong,
            deviceId: deviceId,
            isPlayerReady: isPlayerReady,
            accessToken: accessToken ? 'Present' : 'Missing'
        });
        alert(`Error loading new song: ${error.message}\nPlease check the console for details.`);
    }
}

// Play a song using Spotify Web Playback SDK
async function playSong(trackId) {
    try {
        if (!deviceId) {
            throw new Error('No device ID available. Please wait for the Spotify player to initialize.');
        }

        if (!accessToken) {
            throw new Error('No access token available. Please log in to Spotify again.');
        }

        console.log('Attempting to play track:', trackId);
        console.log('Using device ID:', deviceId);

        const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: [`spotify:track:${trackId}`]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Spotify API Error:', errorData);
            throw new Error(`Failed to play track: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        console.log('Successfully started playing track:', trackId);
    } catch (error) {
        console.error('Error playing song:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            trackId: trackId,
            deviceId: deviceId,
            accessToken: accessToken ? 'Present' : 'Missing'
        });
        throw error;
    }
}

// Generate multiple choice options
function generateOptions() {
    options = [currentSong.title];
    
    // Add 3 random incorrect options
    while (options.length < 4) {
        const randomSong = songs[Math.floor(Math.random() * songs.length)];
        if (!options.includes(randomSong.title)) {
            options.push(randomSong.title);
        }
    }
    
    // Shuffle options
    options = options.sort(() => Math.random() - 0.5);
    
    // Create option buttons
    options.forEach(option => {
        const button = document.createElement('div');
        button.className = 'option';
        button.textContent = option;
        button.addEventListener('click', () => checkAnswer(option));
        optionsContainer.appendChild(button);
    });
}

// Check if the selected answer is correct
function checkAnswer(selectedAnswer) {
    const buttons = optionsContainer.getElementsByClassName('option');
    
    // Disable all options
    Array.from(buttons).forEach(button => {
        button.style.pointerEvents = 'none';
        if (button.textContent === currentSong.title) {
            button.classList.add('correct');
        }
    });
    
    // Mark selected answer
    Array.from(buttons).forEach(button => {
        if (button.textContent === selectedAnswer && selectedAnswer !== currentSong.title) {
            button.classList.add('incorrect');
        }
    });
    
    // Update score if correct
    if (selectedAnswer === currentSong.title) {
        score += 10;
        updateScore();
    }
    
    // Enable next button
    nextButton.disabled = false;
    
    // Increment round
    currentRound++;
}

// Update score display
function updateScore() {
    scoreElement.textContent = score;
}

// Update progress bar
function updateProgress() {
    const progress = (currentRound / TOTAL_ROUNDS) * 100;
    progressBar.style.width = `${progress}%`;
    roundDisplay.textContent = `Round ${currentRound} of ${TOTAL_ROUNDS}`;
}

// Update play/pause button
function updatePlayPauseButton(paused) {
    playPauseButton.textContent = paused ? 'Play' : 'Pause';
}

// End game
function endGame() {
    stopTimer();
    const finalScore = Math.round((score / (TOTAL_ROUNDS * 10)) * 100);
    
    // Save to leaderboard
    saveToLeaderboard(finalScore, elapsedTime);
    
    // Show results
    alert(`Game Over!\nFinal Score: ${finalScore}%\nTime: ${timerDisplay.textContent}`);
    
    // Reset game
    score = 0;
    currentRound = 1;
    startTime = null;
    elapsedTime = 0;
    timerDisplay.textContent = '0:00';
    updateScore();
    updateProgress();
    loadNewSong();
}

// Event listeners
playPauseButton.addEventListener('click', () => {
    player.togglePlay();
});

stopButton.addEventListener('click', () => {
    player.pause();
    player.seek(0);
});

nextButton.addEventListener('click', loadNewSong);

// Start the game
initGame();
