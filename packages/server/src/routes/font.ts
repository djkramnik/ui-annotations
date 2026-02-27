import { Router } from 'express'
import { prisma } from '../db'

export const fontRouter = Router()

fontRouter.get('/random', async (_req, res) => {
  try {
    const bundles = await prisma.font_bundle.findMany({
      select: {
        id: true,
        slug: true,
        family: true,
        css_text: true,
        manifest: true,
        assets: {
          select: {
            font_asset: {
              select: {
                id: true,
                sha1: true,
                ext: true,
              },
            },
          },
        },
      },
    })

    if (bundles.length === 0) {
      return res.status(404).json({ error: 'no font bundles found' })
    }

    const selected = bundles[Math.floor(Math.random() * bundles.length)]
    const rewrittenCssText = await rewriteBundleCssToAssetUrls(selected.css_text, selected.assets)
    return res.status(200).json({
      data: {
        bundle: {
          id: selected.id,
          slug: selected.slug,
          family: selected.family,
          cssText: rewrittenCssText,
          manifest: selected.manifest,
        },
      },
    })
  } catch (error) {
    console.error('failed to load random font bundle', error)
    return res.status(500).json({ error: 'failed to load random font bundle' })
  }
})

async function rewriteBundleCssToAssetUrls(
  cssText: string,
  bundleAssets: Array<{ font_asset: { id: number; sha1: string; ext: string } }>,
): Promise<string> {
  const urlPattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g
  const cache = new Map<string, number>()
  const uniquePaths = Array.from(
    new Set(
      Array.from(cssText.matchAll(urlPattern))
        .map(function toLocalPath(match) {
          return match[2]
        })
        .filter(function keepFontPath(localPath) {
          return /^\.?\/?fonts\//i.test(localPath)
        }),
    ),
  )

  if (uniquePaths.length === 0) {
    return cssText
  }

  for (const localPath of uniquePaths) {
    const resolved = parseHashAndExt(localPath)
    if (!resolved) {
      continue
    }

    const linked = bundleAssets.find(function byLinkedAsset(asset) {
      return (
        asset.font_asset.ext.toLowerCase() === resolved.ext &&
        asset.font_asset.sha1.toLowerCase().startsWith(resolved.hashPrefix)
      )
    })
    if (linked) {
      cache.set(localPath, linked.font_asset.id)
      continue
    }

    const fallback = await prisma.font_asset.findFirst({
      where: {
        ext: resolved.ext,
        sha1: {
          startsWith: resolved.hashPrefix,
        },
      },
      select: { id: true },
    })
    if (fallback) {
      cache.set(localPath, fallback.id)
    }
  }

  if (cache.size === 0) {
    return cssText
  }

  return cssText.replace(
    urlPattern,
    function replaceUrl(match, _quote, localPath: string) {
      if (!/^\.?\/?fonts\//i.test(localPath)) {
        return match
      }
      const id = cache.get(localPath)
      if (!id) {
        return match
      }
      return `url('/api/fonts/assets/${id}')`
    },
  )
}

function parseHashAndExt(localPath: string): { hashPrefix: string; ext: string } | null {
  const withoutQuery = localPath.split('?')[0].split('#')[0]
  const fileName = withoutQuery.split('/').pop()
  if (!fileName) {
    return null
  }

  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!ext) {
    return null
  }

  const hashMatch = fileName.match(/-([a-f0-9]{12})\.[a-z0-9]+$/i)
  if (!hashMatch) {
    return null
  }

  return {
    hashPrefix: hashMatch[1].toLowerCase(),
    ext,
  }
}
