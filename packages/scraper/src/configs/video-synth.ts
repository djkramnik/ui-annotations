import { Page } from "puppeteer-core";
import { InteractiveLabel } from "ui-labelling-shared";
import { randInt, snooze } from "../util";

export async function getVideoLinks(reps: number = 1): Promise<string[]> {
  return new Array(reps)
    .fill(`http://localhost:3000?component=${InteractiveLabel.video}`)
}

// this just consists of .. pressing one or two buttons and waiting.
export async function transformForVideo(page: Page) {
  await page.evaluate(async () => {
    function snooze(ms: number = 500) {
      return new Promise((resolve) => {
        setTimeout(resolve, ms)
      })
    }

    async function genRandomPlayer(attempts: number = 0): Promise<boolean> {
      const players = [
        'twitch-video',
        'tiktok-video',
        'video',
        'mux-player',
        'wistia-video',
        'youtube-video',
        'audio',
        'hls-video',
        'vimeo-video'
      ]
      const player = document.querySelector(players.join(','))
      if (player) {
        player.setAttribute('data-label', 'label_video')
        return true
      }

      if (attempts > 2) {
        return false
      }
      // no player, randomly generate one and try again?
      ;(document.querySelector('#gen_player') as HTMLButtonElement).click()
      await snooze()
      const previewBtn = document.querySelector('.react-player__play-icon')
      if (previewBtn) {
        (previewBtn as HTMLButtonElement).click()
        await snooze()
      }
      return await genRandomPlayer(attempts + 1)
    }

    const success = await genRandomPlayer()
    if (!success) {
      throw Error('could not find player')
    }
  })
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important;}' })

  const seeked = await page.evaluate(async (endBufferSeconds: number) => {
    const mediaEls = Array.from(
      document.querySelectorAll('video, audio')
    ) as Array<HTMLVideoElement | HTMLAudioElement>

    const isPlaying = (el: HTMLVideoElement | HTMLAudioElement) =>
      !el.paused && !el.ended && el.readyState >= 2

    const playingEls = mediaEls.filter(isPlaying)
    if (!playingEls.length) {
      return false
    }

    // Pick a currently playing media element and seek to a random safe point.
    const target = playingEls[Math.floor(Math.random() * playingEls.length)]
    const duration = target.duration

    if (!Number.isFinite(duration) || duration <= 0) {
      return false
    }

    const maxSeek = Math.max(0, duration - endBufferSeconds)
    if (maxSeek <= 0) {
      return false
    }

    const randomTime = Math.random() * maxSeek
    await new Promise<void>((resolve) => {
      let resolved = false
      const done = () => {
        if (!resolved) {
          resolved = true
          resolve()
        }
      }
      const timeout = window.setTimeout(done, 1500)
      target.addEventListener(
        'seeked',
        () => {
          window.clearTimeout(timeout)
          done()
        },
        { once: true }
      )
      target.currentTime = randomTime
    })

    return true
  }, 20)

  await snooze(seeked ? 1000 : 500)

  return async () => {}
}
