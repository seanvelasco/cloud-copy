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
		// Handle standard OPTIONS request.
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

        await DIAGNOSTICS.put(uniqueFilename, fileData, { httpMetadata: { type, contentType } })
        
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

router.get('/favicon.ico', async () => {
    return await fetch('https://seanvelasco.com/favicon.ico')
})

router.get('/:key', async (request, event) => {

    const cache = caches.default

    let response = await cache.match(request)

    if (!response) {

        let body

        try {
            body = await DIAGNOSTICS.get(request.params.key)
        }
        catch (error) {
            return new Response('Invalid key', { status: 400 })
        }
        
        response = new Response(await body.arrayBuffer(), {
            status: 200,
            headers: {
                'cache-control': 'max-age=31536000',
                'content-type': body.httpMetadata.contentType,
                'etag': body.etag
            }
        })

        event.waitUntil(cache.put(request, response.clone()))
    }
    return response
})



router.delete('/:key', async (request) => {
    
        const { key } = request.params
        
        await DIAGNOSTICS.delete(key)

        return new Response(`${key} deleted from R2 DIAGNOSTICS`)
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