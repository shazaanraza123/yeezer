# YEEZER - Kanye West Song Guessing Game

A fun web-based game where you guess Kanye West songs! Built with HTML, CSS, JavaScript, and the Spotify Web Playback SDK.

## Features

- Play 10 rounds of Kanye West song guessing
- Listen to full songs from Kanye's discography
- Track your score and completion time
- View your best times on the leaderboard
- Beautiful, responsive design

## How to Play

1. Log in with your Spotify account
2. Listen to the song that plays
3. Select the correct song title from the options
4. Try to get the highest score in the fastest time
5. View your best times on the leaderboard

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Spotify Web Playback SDK
- Spotify API

## Setup

1. Clone the repository
2. Create a Spotify Developer account and create a new app
3. Add your Spotify Client ID to the environment variables
4. Set up your redirect URI in the Spotify Developer Dashboard
5. Run the server: `python3 -m http.server 8000`
6. Open `http://localhost:8000` in your browser

## Environment Variables

Create a `.env` file with the following variables:
```
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_REDIRECT_URI=http://localhost:8000
```

## License

MIT License