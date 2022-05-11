import { Router } from 'itty-router'

const router = Router()

addEventListener('fetch', event => {
    event.respondWith(router.handle(event.request, event))
})

router.options('*', (request) => {
    if (request.headers.get("Origin") !== null &&
        request.headers.get("Access-Control-Request-Method") !== null &&
        request.headers.get("Access-Control-Request-Headers") !== null) {
        // Handle CORS pre-flight request.
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Origin",
            }
        })
    } else {
        return new Response(null, {
            headers: {
                "Allow": "GET, HEAD, POST, OPTIONS",
            }
        })
    }
})

router.post('/', async (request) => {

    try {

        const formData = await request.formData()

        const id = formData.get('id')

        const file = formData.get('file') || formData.get('files')

        for (const entries of formData) {

            const file = entries[1]

            const { name, type, size } = file
            console.log(name, type, size)
        }

        const { name, type, size } = file

        console.log(name, type, size)


        const contentType = type

        const fileData = await file.arrayBuffer()

        // decodeURIComponent(name)

        const ext = name.split('.').pop().toLowerCase()

        const [filename, ...extensions] = name.split('.')
        let extension = extensions.join('.')

        let uniqueFilename = 'random'

        if (id) {
            uniqueFilename = id
        }
        else {
            uniqueFilename = crypto.randomUUID() + '.' + ext
        }

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
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Origin',
                'Access-Control-Max-Age': '86400',
                'Content-Type': 'application/json'
            }
        })
    }
    catch (error) {
        console.log(error)
        return new Response(JSON.stringify({
            success: false,
            message: error.message
        }), {
            status: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
                'Access-Control-Max-Age': '86400',
                'Content-Type': 'application/json'
            }
        })
    }
})

router.get('/list', async (request) => {
    const { objects } = await BUCKET.list()

    const payload = objects.map(file => {
        const { httpMetadata, uploaded, size, key } = file
        const { contentType } = httpMetadata

        const url = new URL(request.url)
        url.pathname = key
        const href = url.href

        return {
            href,
            contentType,
            uploaded,
            size
        }
    })
    
    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Origin',
            'Access-Control-Max-Age': '86400',
            'Content-Type': 'application/json'
        }
    })
})

router.get('/', async (request) => {

    const { upload } = request.query

    if (!upload) {
        return new Response(null)
    }

    const response = await fetch(upload)

    const contentType = response.headers.get('content-type')
    const type = contentType
    const fileData = await response.arrayBuffer()

    const uniqueFilename = crypto.randomUUID()

    await BUCKET.put(uniqueFilename, fileData, { httpMetadata: { type, contentType } })

    const returnUrl = new URL(request.url)
    
    for (const key of Object.keys(await request.query)) {
        console.log(key)
        returnUrl.searchParams.delete(key)
    }

    returnUrl.pathname = uniqueFilename

    const payload = {
        success: true,
        message: `${upload} uploaded successfully`,
        href: returnUrl,
    }

    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Origin',
            'Access-Control-Max-Age': '86400',
            'Content-Type': 'application/json'
        }
    })
})


router.get('/favicon.ico', async () => {
    return await fetch('https://seanvelasco.com/favicon.ico')
})

router.get('/:key', async (request, event) => {

    const key = request.params.key

    if (!key) {
        return new Response(null)
    }

    const cache = caches.default

    let response = await cache.match(request)

    if (!response) {

        let file = await BUCKET.get(key)

        if (!file) {
            return new Response("Not found", {
                status: 404,
            })
        }

        const payload = await file.body

        response = new Response(payload, {
            status: 200,
            headers: {
                'cache-control': 'max-age=31536000',
                'content-type': file.httpMetadata.contentType,
                'etag': file.etag
            }
        })

        event.waitUntil(cache.put(request, response.clone()))
    }
    return response
})

router.delete('/:key', async (request) => {

    const { key } = request.params

    await BUCKET.delete(key)

    return new Response(`${key} deleted from bucket`)
})

router.all('*', async () => {
    return new Response(`Not found`, {
        status: 404,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS'
        }
    })
})