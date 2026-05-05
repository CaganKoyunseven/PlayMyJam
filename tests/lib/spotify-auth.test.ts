import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/lib/supabase';

// Set env before any import so module-level constants pick them up
process.env.SPOTIFY_CLIENT_ID = 'test-client-id';
process.env.SPOTIFY_CLIENT_SECRET = 'test-client-secret';
process.env.SPOTIFY_REDIRECT_URI = 'http://localhost:3000/api/spotify/callback';

// Mock supabase so refreshVenueToken doesn't hit DB
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

vi.mock('@/lib/constants', () => ({
  DEFAULT_VENUE_ID: '00000000-0000-0000-0000-000000000001',
}));

describe('getSpotifyAuthUrl', () => {
  it('returns a valid Spotify authorize URL', async () => {
    const { getSpotifyAuthUrl } = await import('@/lib/spotify-auth');
    const url = getSpotifyAuthUrl('state-abc');
    expect(url).toContain('https://accounts.spotify.com/authorize');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('state=state-abc');
    expect(url).toContain('response_type=code');
  });

  it('includes required scopes', async () => {
    const { getSpotifyAuthUrl } = await import('@/lib/spotify-auth');
    const url = getSpotifyAuthUrl('s');
    expect(url).toContain('scope=');
    expect(decodeURIComponent(url)).toContain('streaming');
  });
});

describe('getClientCredentialsToken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches a token from Spotify accounts API', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'cc-token-123', expires_in: 3600 }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { getClientCredentialsToken } = await import('@/lib/spotify-auth');
    const token = await getClientCredentialsToken();

    expect(token).toBe('cc-token-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://accounts.spotify.com/api/token',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws when Spotify returns non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const { getClientCredentialsToken } = await import('@/lib/spotify-auth');
    await expect(getClientCredentialsToken()).rejects.toThrow('401');
  });
});

describe('exchangeCodeForTokens', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges code for tokens via POST to Spotify', async () => {
    const mockTokens = { access_token: 'at', refresh_token: 'rt', expires_in: 3600 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTokens,
    }));

    const { exchangeCodeForTokens } = await import('@/lib/spotify-auth');
    const result = await exchangeCodeForTokens('auth-code');
    expect(result).toEqual(mockTokens);
  });

  it('throws when exchange fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    const { exchangeCodeForTokens } = await import('@/lib/spotify-auth');
    await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow('400');
  });
});

describe('refreshVenueToken and getVenueToken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns valid token without fetching if expiry is in the future', async () => {
    // Setup supabase mock to return valid future expiry
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn()
        .mockResolvedValueOnce({ data: { spotify_refresh_token: 'rt', spotify_token_expires_at: futureDate }, error: null })
        .mockResolvedValueOnce({ data: { spotify_access_token: 'valid-at' }, error: null }),
    } as never);

    const { refreshVenueToken } = await import('@/lib/spotify-auth');
    const token = await refreshVenueToken('venue-1');

    expect(token).toBe('valid-at');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches new token if expiry is in the past', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { spotify_refresh_token: 'rt', spotify_token_expires_at: pastDate }, error: null }),
    } as never);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-at', expires_in: 3600 }),
    }));

    const { refreshVenueToken } = await import('@/lib/spotify-auth');
    const token = await refreshVenueToken('venue-1');

    expect(token).toBe('new-at');
    expect(fetch).toHaveBeenCalled();
  });

  it('throws error if refresh token is missing', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as never);

    const { refreshVenueToken } = await import('@/lib/spotify-auth');
    await expect(refreshVenueToken('venue-1')).rejects.toThrow('No refresh token for venue');
  });

  it('getVenueToken returns null on error', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    } as never);

    const { getVenueToken } = await import('@/lib/spotify-auth');
    const token = await getVenueToken();
    expect(token).toBeNull();
  });
});
