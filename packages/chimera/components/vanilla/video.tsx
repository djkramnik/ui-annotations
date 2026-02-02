// RandomReactPlayerGenerator.tsx
import React, { useState, useMemo } from 'react';
import ReactPlayer from 'react-player';

type RandomPlayerConfig = {
  url: string;
  playing: boolean;
  controls: boolean;
  light: boolean;
  loop: boolean;
  muted: boolean;
  volume: number;
  playbackRate: number;
  width: number; // px
};

const DEFAULT_URLS = [
  // HTML
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/webm/vp8/360/Big_Buck_Bunny_360_10s_1MB.webm',
  'https://storage.googleapis.com/media-session/elephants-dream/the-wires.mp3',
  // HLS
  'https://stream.mux.com/VcmKA6aqzIzlg3MayLJDnbF55kX00mds028Z65QxvBYaA.m3u8',
  // DASH
  // 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps_640x360_800k.mpd',
  // Mux
  'https://stream.mux.com/maVbJv2GSYNRgS02kPXOOGdJMWGU1mkA019ZUjYE7VU7k',
  'https://stream.mux.com/Sc89iWAyNkhJ3P1rQ02nrEdCFTnfT01CZ2KmaEcxXfB008',
  // YouTube
  'https://www.youtube.com/watch?v=oUFJJNQGwhk',
  'https://www.youtube.com/watch?v=jNgP6d9HraI',
  'https://www.youtube.com/playlist?list=PLRfhDHeBTBJ7MU5DX4P_oBIRN457ah9lA',
  // Vimeo
  'https://vimeo.com/90509568',
  'https://vimeo.com/169599296',
  // Wistia
  'https://home.wistia.com/medias/e4a27b971d',
  'https://home.wistia.com/medias/29b0fbf547',
  'https://home.wistia.com/medias/bq6epni33s',
  // Spotify
  // 'https://open.spotify.com/episode/5Jo9ncrz2liWiKj8inZwD2',
  // Twitch
  'https://www.twitch.tv/videos/106400740',
  'https://www.twitch.tv/kronovi',
  // TikTok
  'https://www.tiktok.com/@_luwes/video/7527476667770522893',
  'https://www.tiktok.com/@scout2015/video/6718335390845095173',
];

const PLAYBACK_RATE_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

export const VanillaVideo: React.FC = () => {
  // "Form" state – what the user currently has filled out
  const [urlsInput, setUrlsInput] = useState(DEFAULT_URLS.join('\n'));
  const [allowControls, setAllowControls] = useState(true);
  const [allowLight, setAllowLight] = useState(true);
  const [allowLoop, setAllowLoop] = useState(true);
  const [allowMuted, setAllowMuted] = useState(true);
  const [minVolume, setMinVolume] = useState(0.1); // 0–1
  const [maxVolume, setMaxVolume] = useState(1);
  const [enabledRates, setEnabledRates] = useState<number[]>([1, 1.5, 2]);

  const [config, setConfig] = useState<RandomPlayerConfig | null>(null);

  const candidateUrls = useMemo(
    () =>
      urlsInput
        .split('\n')
        .map(u => u.trim())
        .filter(Boolean),
    [urlsInput]
  );

  const toggleRate = (rate: number) => {
    setEnabledRates(prev =>
      prev.includes(rate) ? prev.filter(r => r !== rate) : [...prev, rate]
    );
  };

  const clampVolumeRange = () => {
    let min = Math.max(0, Math.min(1, minVolume));
    let max = Math.max(0, Math.min(1, maxVolume));
    if (min > max) {
      [min, max] = [max, min];
    }
    setMinVolume(min);
    setMaxVolume(max);
    return { min, max };
  };

  const handleGenerate = () => {
    if (!candidateUrls.length) {
      alert('Please provide at least one URL.');
      return;
    }
    if (!enabledRates.length) {
      alert('Please enable at least one playback rate.');
      return;
    }

    const { min, max } = clampVolumeRange();

    const randomUrl =
      candidateUrls[Math.floor(Math.random() * candidateUrls.length)];

    const randBool = () => Math.random() < 0.5;
    const randomInRange = (a: number, b: number) =>
      a + Math.random() * (b - a);

    const randomRate =
      enabledRates[Math.floor(Math.random() * enabledRates.length)];

    const randomWidth = Math.floor(randomInRange(260, 960)); // px, arbitrary range

    const nextConfig: RandomPlayerConfig = {
      url: randomUrl,
      playing: randBool(), // could force true if you prefer
      controls: allowControls ? randBool() : false,
      light: allowLight ? randBool() : false,
      loop: allowLoop ? randBool() : false,
      muted: allowMuted ? randBool() : false,
      volume: Number(randomInRange(min, max).toFixed(2)),
      playbackRate: randomRate,
      width: randomWidth,
    };

    setConfig(nextConfig);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Simple "form" to constrain what the randomizer can pick from */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 8px' }}>Candidate URLs</h2>
          <p style={{ margin: '0 0 4px', fontSize: 12, opacity: 0.8 }}>
            One URL per line. The random generator will pick one of these.
          </p>
          <textarea
            value={urlsInput}
            onChange={e => setUrlsInput(e.target.value)}
            rows={12}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 4px' }}>Boolean options</h3>
            <label style={{ display: 'block', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={allowControls}
                onChange={e => setAllowControls(e.target.checked)}
              />{' '}
              Randomize <code>controls</code> (otherwise always false)
            </label>
            <label style={{ display: 'block', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={allowLight}
                onChange={e => setAllowLight(e.target.checked)}
              />{' '}
              Randomize <code>light</code> (placeholder thumbnail)
            </label>
            <label style={{ display: 'block', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={allowLoop}
                onChange={e => setAllowLoop(e.target.checked)}
              />{' '}
              Randomize <code>loop</code>
            </label>
            <label style={{ display: 'block', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={allowMuted}
                onChange={e => setAllowMuted(e.target.checked)}
              />{' '}
              Randomize <code>muted</code>
            </label>
          </div>

          <div>
            <h3 style={{ margin: '8px 0 4px' }}>Volume range (0–1)</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 14 }}>
                Min:{' '}
                <input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  value={minVolume}
                  onChange={e => setMinVolume(Number(e.target.value))}
                  style={{ width: 80 }}
                />
              </label>
              <label style={{ fontSize: 14 }}>
                Max:{' '}
                <input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  value={maxVolume}
                  onChange={e => setMaxVolume(Number(e.target.value))}
                  style={{ width: 80 }}
                />
              </label>
            </div>
          </div>

          <div>
            <h3 style={{ margin: '8px 0 4px' }}>Playback rates</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PLAYBACK_RATE_OPTIONS.map(rate => (
                <label key={rate} style={{ fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={enabledRates.includes(rate)}
                    onChange={() => toggleRate(rate)}
                  />{' '}
                  {rate}x
                </label>
              ))}
            </div>
          </div>

          <button
            id="gen_player"
            type="button"
            onClick={handleGenerate}
            style={{ marginTop: 8, padding: '6px 12px', cursor: 'pointer' }}
          >
            Generate random player
          </button>
        </div>
      </section>

      {config && (
        <>
          {/* Text printout of the random options */}
          <section>
            <h2 style={{ margin: '0 0 8px' }}>Random player config</h2>
            <pre
              style={{
                margin: 0,
                padding: 12,
                background: '#111',
                color: '#f5f5f5',
                fontSize: 12,
                borderRadius: 4,
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(
                {
                  url: config.url,
                  playing: config.playing,
                  controls: config.controls,
                  light: config.light,
                  loop: config.loop,
                  muted: config.muted,
                  volume: config.volume,
                  playbackRate: config.playbackRate,
                  widthPx: config.width,
                },
                null,
                2
              )}
            </pre>
          </section>

          {/* Vertical gap, then the player using those options */}
          <section style={{ marginTop: 16 }}>
            <div
              style={{
                width: config.width,
                maxWidth: '100%',
              }}
            >
              <ReactPlayer
                src={config.url}
                playing={config.playing}
                controls={config.controls}
                light={config.light}
                loop={config.loop}
                muted={config.muted}
                volume={config.volume}
                playbackRate={config.playbackRate}
                width="100%"
                height="auto"
                style={{ aspectRatio: '16/9' }}
                config={{
                  youtube: { color: 'white' },
                  vimeo: { color: 'ffffff' },
                  spotify: { preferVideo: true },
                  tiktok: {
                    fullscreen_button: false, // explicitly disable
                    progress_bar: true,
                    play_button: true,
                    volume_control: true,
                    timestamp: false,
                    music_info: false,
                    description: false,
                    rel: false,
                    native_context_menu: true,
                    closed_caption: false,
                  },
                }}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
};

