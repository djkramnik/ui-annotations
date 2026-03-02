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

const detectProvider = (url: string): string => {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('vimeo.com')) return 'vimeo';
  if (url.includes('twitch.tv')) return 'twitch';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('wistia.com')) return 'wistia';
  if (url.includes('mux.com')) return 'mux';
  if (url.endsWith('.m3u8')) return 'hls';
  if (url.endsWith('.mpd')) return 'dash';
  if (url.endsWith('.mp3')) return 'audio';
  return 'generic';
};


const TIKTOK_URLS = [
  'https://www.tiktok.com/@martinlopez2269/video/7611344380259077390',
  'https://www.tiktok.com/@_brad_marchand/video/7604509356075339028',
  'https://www.tiktok.com/@thaeshweyeephyo51/video/7609178277789519125',
  'https://www.tiktok.com/@orlandopirates/video/7604097684533726484',
  'https://www.tiktok.com/@.zuzuuuq/video/7586977176071851286',
  'https://www.tiktok.com/@milypurr/video/7589072467923094840',
  'https://www.tiktok.com/@marc_news/video/7607351729000156434',
  'https://www.tiktok.com/@edibertotrisha/video/7609995943693372685',
  'https://www.tiktok.com/@yoon38624/video/7602498275501034760',
  'https://www.tiktok.com/@c.h.l.o.e.e/video/7606856370419207447',
  'https://www.tiktok.com/@www.tiktok.comsokphanith/video/7611543410213768468',
  'https://www.tiktok.com/@brown.fam_/video/7605746514274667798',
  'https://www.tiktok.com/@user3746210595559/video/7601730635459235095',
  'https://www.tiktok.com/@cyndyhanna666/video/7605944345807555871',
  'https://www.tiktok.com/@phinsophannya/video/7601689829771922706',
  'https://www.tiktok.com/@zucklar_/video/7603454465672301837',
  'https://www.tiktok.com/@officialbobbydancing/video/7607036830986276114',
  'https://www.tiktok.com/@albertvidss/video/7608638677614398742',
  'https://www.tiktok.com/@putsywaa/video/7584764524507450645',
  'https://www.tiktok.com/@ai.fact.s/video/7602789102123011341',
  'https://www.tiktok.com/@kiklidanceacademy/video/7607047781534141718',
  'https://www.tiktok.com/@abood.alshaer88/video/7602163943271894293',
  'https://www.tiktok.com/@jonbernardk/video/7603661736520027413',
  'https://www.tiktok.com/@koteekopong/video/7600235888920055058',
  'https://www.tiktok.com/@m_jojomc/video/7580092696790945057',
  'https://www.tiktok.com/@ssamaragohar47/video/7603057299783191831',
  'https://www.tiktok.com/@oxyhiiii/video/7601738245432462614',
  'https://www.tiktok.com/@magnoliaartstiktok/video/7605072744325139730',
  'https://www.tiktok.com/@senzoofficial02/video/7609618623904140565',
  'https://www.tiktok.com/@edmondx.fan8/video/7610768666098945301',
  'https://www.tiktok.com/@lyricsandvibes7/video/7603369558908357908',
  'https://www.tiktok.com/@harleen_005/video/7601617959542361366',
  'https://www.tiktok.com/@petsnaps0/video/7603088688255487262',
  'https://www.tiktok.com/@delegatefowler/video/7605352796170292510',
  'https://www.tiktok.com/@france_girls0/video/7602758724054207766',
  'https://www.tiktok.com/@thereal_kaymedusa/video/7610104622635617554',
  'https://www.tiktok.com/@ueik_thw/video/7602891902836362504',
  'https://www.tiktok.com/@jueves_tattoo/video/7611253921184517384',
  'https://www.tiktok.com/@losdekchuchaoficial/video/7611854473375386900'
]

const YOUTUBE_URLS: string[] = [
'https://youtu.be/DqCcZk8T9Wk?si=ZzCYnavwmngtRZ2c',
'https://youtu.be/G6Kspj3OO0s',
'https://youtu.be/s88r_q7oufE?list=RDs88r_q7oufE',
'https://youtu.be/muoWDA6zmsY?list=RDmuoWDA6zmsY',
'https://youtu.be/Xk73PkJt9gI',
'https://youtu.be/t-PuYjOVebc',
'https://youtu.be/EpOyzzNuwVk',
'https://youtu.be/vV8IAOojoAA?list=RDvV8IAOojoAA',
'https://youtu.be/vtSnBsI4raU',
'https://youtu.be/7sJOfaWjPmo',
'https://youtu.be/ZF4T833lln4',
'https://youtu.be/R6-cNg2nyB4',
'https://youtu.be/OiPiRKbNCWY?list=RDOiPiRKbNCWY',
'https://youtu.be/a4pBXzDPErQ?list=RDa4pBXzDPErQ',
'https://youtu.be/a9eNQZbjpJk?list=RDa9eNQZbjpJk',
'https://youtu.be/1vx8iUvfyCY',
'https://youtu.be/xvV98jQGTC8',
'https://youtu.be/yrrcL03itbA',
'https://www.youtube.com/shorts/bzLfzAqY5XE?',
'https://youtu.be/oH-txHzE4jA',
'https://youtu.be/eVli-tstM5E',
'https://youtu.be/4rXwJmBVvmo',
'https://youtu.be/mE3SvDwecBA',
'https://youtu.be/OhWM4_pIKVg',
'https://youtu.be/NJJ8WEjD8SY?list=RDNJJ8WEjD8SY',
'https://youtu.be/US0Ty2nngjw',
'https://youtu.be/izDAOvHz5Wc',
'https://youtu.be/SSIcrYZvnuE'

]

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
].concat(TIKTOK_URLS).concat(YOUTUBE_URLS);




const PLAYBACK_RATE_OPTIONS = [0.5, 1, 1.25, 1.5, 2];

export const VanillaVideo: React.FC = () => {
  // "Form" state – what the user currently has filled out
  const [urlsInput, setUrlsInput] = useState(DEFAULT_URLS.join('\n'));
  const [allowControls, setAllowControls] = useState(true);
  const [allowLight, setAllowLight] = useState(true);
  const [allowLoop, setAllowLoop] = useState(true);
  const [allowMuted, setAllowMuted] = useState(true);
  const [autoplayCompat, setAutoplayCompat] = useState(true);
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
      // playing: true,
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

  const effectiveConfig = useMemo(() => {
    if (!config) return null;
    if (!autoplayCompat) return config;
    if (!config.playing) return config;

    // Browser/provider autoplay is far more reliable in this mode.
    return {
      ...config,
      light: false,
      muted: true,
    };
  }, [autoplayCompat, config]);

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
            <label style={{ display: 'block', fontSize: 14 }}>
              <input
                type="checkbox"
                checked={autoplayCompat}
                onChange={e => setAutoplayCompat(e.target.checked)}
              />{' '}
              Autoplay compatibility mode (if <code>playing=true</code>, force{' '}
              <code>light=false</code> and <code>muted=true</code>)
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

      {effectiveConfig && (
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
                  provider: detectProvider(effectiveConfig.url),
                  url: effectiveConfig.url,
                  playing: effectiveConfig.playing,
                  controls: effectiveConfig.controls,
                  light: effectiveConfig.light,
                  loop: effectiveConfig.loop,
                  muted: effectiveConfig.muted,
                  volume: effectiveConfig.volume,
                  playbackRate: effectiveConfig.playbackRate,
                  widthPx: effectiveConfig.width,
                  autoplayCompatibilityMode: autoplayCompat,
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
                width: effectiveConfig.width,
                maxWidth: '100%',
              }}
            >
              <ReactPlayer
                src={effectiveConfig.url}
                playing={effectiveConfig.playing}
                controls={effectiveConfig.controls}
                light={effectiveConfig.light}
                loop={effectiveConfig.loop}
                muted={effectiveConfig.muted}
                volume={effectiveConfig.volume}
                playbackRate={effectiveConfig.playbackRate}
                playsInline
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
