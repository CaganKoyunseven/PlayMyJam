// Spotify Web API client
// Required env vars (add to .env.local):
//   SPOTIFY_CLIENT_ID=
//   SPOTIFY_CLIENT_SECRET=

export type SpotifyTrack = {
  spotifyId: string;
  title: string;
  artist: string;
  albumArt: string;
  genre: string;
};

async function getAccessToken(): Promise<string> {
  // TODO: implement client credentials flow
  // const res = await fetch('https://accounts.spotify.com/api/token', {
  //   method: 'POST',
  //   headers: {
  //     Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //   },
  //   body: 'grant_type=client_credentials',
  // });
  // const data = await res.json();
  // return data.access_token;
  throw new Error('Spotify credentials not configured');
}

export async function getPlaylistTracks(_playlistId: string | null): Promise<SpotifyTrack[]> {
  // TODO: wire up when credentials are ready
  // const token = await getAccessToken();
  // const res = await fetch(`https://api.spotify.com/v1/playlists/${_playlistId}/tracks`, {
  //   headers: { Authorization: `Bearer ${token}` },
  // });
  // const data = await res.json();
  // return data.items.map((item: any) => ({
  //   spotifyId: item.track.id,
  //   title: item.track.name,
  //   artist: item.track.artists[0].name,
  //   albumArt: item.track.album.images[0]?.url ?? '',
  //   genre: '',
  // }));
  return [];
}

export async function getTrendingTracks(): Promise<SpotifyTrack[]> {
  // TODO: wire up when credentials are ready
  return [];
}
