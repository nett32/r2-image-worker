import { Hono, type Next, type Context } from 'hono'
import { cache } from 'hono/cache'
import { sha256, md5 } from 'hono/utils/crypto'
import { getExtension } from 'hono/utils/mime'
import { basicAuth } from 'hono/basic-auth'
import * as z from 'zod'
import { homepageHtml } from './html'

const maxAge = 60 * 60 * 24 * 30

const app = new Hono<{ Bindings: Cloudflare.Env }>()

async function authMiddleware(c: Context<{ Bindings: Cloudflare.Env }>, next: Next) {
  const auth = basicAuth({
    username: c.env.USER,
    password: c.env.PASS,
  })
  await auth(c, next)
}

app.get('/', authMiddleware, (c) => {
  return c.html(homepageHtml)
})

app.put('/upload', authMiddleware, async (c) => {
  const data = await c.req.parseBody<{ image: File; width: string; height: string }>()

  const body = data.image
  const type = data.image.type
  const extension = getExtension(type) ?? 'png'

  let key

  if (data.width && data.height) {
    key = (await sha256(await body.text())) + `_${data.width}x${data.height}` + '.' + extension
  } else {
    key = (await sha256(await body.text())) + '.' + extension
  }

  await c.env.BUCKET.put(key, body, { httpMetadata: { contentType: type } })

  return c.text(await hashFilename(key, c.env.SECURITY_KEY))
})

app.get(
  '*',
  cache({
    cacheName: 'r2-image-worker'
  })
)

const imageParameterSchema = z.object({
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  quality: z.coerce.number().optional()
})

const getPreferredContentType = (acceptHeader: string | undefined, fallback: string) => {
  if (acceptHeader) {
    const types = ['image/avif', 'image/webp']
    for (const type of types) {
      if (acceptHeader.includes(type)) {
        return type
      }
    }
  }
  return fallback
}

app.get('/:key', async (c) => {
  const key = c.req.param('key')

  const filename = await checkKey(key, c.env.SECURITY_KEY)
  if (!filename) {
    return c.notFound()
  }

  const object = await c.env.BUCKET.get(filename)
  if (!object) return c.notFound()
  const contentType = object.httpMetadata?.contentType ?? ''

  if (c.env.IMAGES) {
    const schemaResult = imageParameterSchema.safeParse(c.req.query())
    if (schemaResult.success) {
      const preferredContentType = getPreferredContentType(c.req.header('Accept'), contentType)
      const parameters = schemaResult.data
      const imageResult = await c.env.IMAGES.input(object.body).transform(parameters).output({
        //@ts-expect-error the contentType maybe valid format
        format: preferredContentType,
        quality: parameters.quality
      })
      const res = imageResult.response()
      res.headers.set('Cache-Control', `public, max-age=${maxAge}`)
      return res
    }
  }

  const data = await object.arrayBuffer()
  return c.body(data, 200, {
    'Cache-Control': `public, max-age=${maxAge}`,
    'Content-Type': contentType
  })
})

/**
 * Generates a short, unique, and non-guessable key for the public URL.
 * This is to prevent people from guessing the filename of the uploaded images.
 * @param filename The original filename of the image.
 * @param securityKey A secret key to use for hashing.
 * @returns A hashed key for the image.
 */
async function hashFilename(filename: string, securityKey: string) {
  return (await md5(securityKey + filename))?.substring(0, 8) + filename
}

/**
 * Checks if the provided key is valid.
 * @param key The key from the URL.
 * @param securityKey A secret key to use for hashing.
 * @returns The original filename if the key is valid, otherwise false.
 */
async function checkKey(key: string, securityKey: string) {
  const filename = key.substring(8)
  const hash = await hashFilename(filename, securityKey)
  if (hash !== key) {
    return false
  }
  return filename
}

export default app
