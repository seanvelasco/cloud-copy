import { Router } from 'itty-router'

const router = Router()

addEventListener('fetch', event => {
    event.respondWith(router.handle(event.request))
})

router.post('/', async (request) => {

    const formData = await request.formData()
    const file = formData.get('file')
    const { name, type, size } = file

    const contentType = type

    const fileData = await file.arrayBuffer()

    // decodeURIComponent(name)

    const ext = name.split('.').pop().toLowerCase()

    const [filename, ...extensions] = name.split('.')
    let extension = extensions.join('.')

    const uniqueFilename = crypto.randomUUID() + '.' + ext

    await BUCKET.put(uniqueFilename, fileData, { httpMetadata: { type, contentType } })
    
    const returnUrl = new URL(request.url)
	returnUrl.searchParams.delete('key')
	returnUrl.pathname = uniqueFilename
    const href = returnUrl.href

    const payload = {
        success: true,
        message: `${name} uploaded successfully`,
        href
    }

    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    })
})

router.get('/favicon.ico', async () => {
    return await fetch('https://seanvelasco.com/favicon.ico')
})

router.get('/:key', async (request) => {

    const cache = caches.default

    let cachedResponse = await cache.match(request)

    if (!cachedResponse) {

        let body

        try {
            body = await BUCKET.get(request.params.key)
        }
        catch (error) {
            return new Response('Invalid key', { status: 400 })
        }

        return new Response(await body.arrayBuffer(), {
            status: 200,
            headers: {
                'cache-control': 'max-age=31536000',
                'content-type': body.httpMetadata.contentType,
                'etag': body.etag
            }
        })
    }

    return cachedResponse
})



router.delete('/:key', async (request) => {
    
        const { key } = request.params
        
        await BUCKET.delete(key)

        return new Response(`${key} deleted from R2 bucket`)
})

router.all('*', async () => {
    return new Response(`Not found`, { status: 404 })
})