import requests
import json
import webbrowser
from urllib.parse import quote


# Spotify API Configuration
CLIENT_ID = '22aa1a7303fa47dd99e3a35c4e1fff73'
REDIRECT_URI = 'http://localhost:8000'
SCOPES = 'user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state user-library-read'

# Use the provided access token
ACCESS_TOKEN = 'BQCl4J0pJ0gLEC3uWXQbEXOrUwtPzPIQ7g1PozHfpf7GMIizwX0rN1rWGi0jsnNE3LPwrU7Kd4RylQEVNK_lfuXNp1G_7A1OJnWO1yWCiXMtSWboxt1q_lh-YkO-f1cppnjXKFq2PVVkjQ_L_nTEhcaDVhENpLozPdI7F2bgr-zALzDhBLlga4yQiFDj5bwzsUa4_OGxiXJ_Qe41tpBfe8s7Ih7beXxkFtz3FLNxB0226_2EfH8K2RFZJd2G2Of5f2YCCBz6tAM'

def test_artist_tracks(headers, artist_name, artist_id):
    """Test getting tracks for a specific artist"""
    print(f"\nTesting {artist_name}'s tracks...")
    
    # Get artist info
    artist_response = requests.get(
        f'https://api.spotify.com/v1/artists/{artist_id}',
        headers=headers
    )
    
    if artist_response.status_code == 200:
        artist_data = artist_response.json()
        print(f"Found artist: {artist_data['name']}")
        print(f"Followers: {artist_data['followers']['total']}")
    else:
        print(f"Error getting artist info: {artist_response.status_code}")
        print(artist_response.text)
        return []

    # Try both search and top tracks endpoints
    tracks_with_previews = []
    
    # Method 1: Search endpoint
    search_response = requests.get(
        f'https://api.spotify.com/v1/search?q=artist:{quote(artist_name)}&type=track&market=US&limit=50',
        headers=headers
    )
    
    if search_response.status_code == 200:
        search_data = search_response.json()
        search_tracks = search_data['tracks']['items']
        search_previews = [t for t in search_tracks if t['preview_url']]
        tracks_with_previews.extend(search_previews)
        print(f"Found {len(search_previews)} tracks with previews from search")
    else:
        print(f"Search error: {search_response.status_code}")
        print(search_response.text)
    
    # Method 2: Top tracks endpoint
    top_tracks_response = requests.get(
        f'https://api.spotify.com/v1/artists/{artist_id}/top-tracks?market=US',
        headers=headers
    )
    
    if top_tracks_response.status_code == 200:
        top_tracks_data = top_tracks_response.json()
        top_tracks = top_tracks_data['tracks']
        top_previews = [t for t in top_tracks if t['preview_url']]
        print(f"Found {len(top_previews)} tracks with previews from top tracks")
        
        # Add only new tracks that aren't already in the list
        new_tracks = [t for t in top_previews if t['id'] not in [existing['id'] for existing in tracks_with_previews]]
        tracks_with_previews.extend(new_tracks)
    else:
        print(f"Top tracks error: {top_tracks_response.status_code}")
        print(top_tracks_response.text)
    
    print(f"\nTotal unique tracks with preview URLs: {len(tracks_with_previews)}")
    if tracks_with_previews:
        print("\nFirst 3 tracks with previews:")
        for track in tracks_with_previews[:3]:
            print(f"- {track['name']} (from {track['album']['name']})")
            print(f"  Preview URL: {track['preview_url']}")
    
    return tracks_with_previews

def test_spotify_api():
    """Test the Spotify API"""
    headers = {
        'Authorization': f'Bearer {ACCESS_TOKEN}'
    }
    
    # Test with multiple artists
    artists = [
        ('Kanye West', '5K4W6rqBFWDnAN6FQUkS6x'),
        ('Drake', '3TVXtAsR1Inumwj472S9r4'),
        ('Taylor Swift', '06HL4z0CvFAxyc27GXpf02'),
        ('The Weeknd', '1Xyo4u8uXC1ZmMpatF05PJ')
    ]
    
    all_tracks = []
    for artist_name, artist_id in artists:
        tracks = test_artist_tracks(headers, artist_name, artist_id)
        all_tracks.extend(tracks)
    
    return len(all_tracks) > 0

def main():
    print("Spotify API Test Script")
    print("=====================")
    
    if test_spotify_api():
        print("\n✅ Success! Found tracks with preview URLs.")
        print("The Spotify API is working correctly.")
    else:
        print("\n❌ No tracks with preview URLs found.")
        print("This might be due to:")
        print("1. Regional restrictions")
        print("2. Missing permissions")
        print("3. Preview availability issues")
        print("\nTry running the script again to get a fresh token.")

if __name__ == "__main__":
    main() 