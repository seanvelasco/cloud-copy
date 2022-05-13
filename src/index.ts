import { Router } from "itty-router";

const router = Router()

interface Environment {
	BUCKET: R2Bucket
}

router.get("/", async (request, env: Environment) => {

	const query = new URLSearchParams(request.query)

	const upload = query.get("upload")

	if (!upload) {
		return new Response(null)
	}

	const response = await fetch(upload)

	const contentType = response.headers.get('content-type') || 'application/octet-stream'

	const fileData = await response.arrayBuffer()

	const uniqueFilename = crypto.randomUUID()

	const returnUrl = new URL(request.url)

	query.forEach((value, key) => {
		returnUrl.searchParams.delete(key)
	})

	// for (const key of Object.keys(query)) {
	// 	returnUrl.searchParams.delete(key)
	// }

	returnUrl.pathname = uniqueFilename

	const message = {
		success: true,
		message: `${upload} uploaded successfully`,
		url: returnUrl
	}

	await env.BUCKET.put(uniqueFilename, fileData, {
		httpMetadata: {
			contentType
		}
	})

	return new Response(JSON.stringify(message), {
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

router.get('/list', async (request, env) => {

    const { objects }: R2Objects = await env.BUCKET.list()

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


router.get('/:key', async (request, env: Environment, event) => {

	const { key }: any = request.params

	if (!key) {
		return new Response(null)
	}

	const cache = caches.default

	const cacheUrl = new URL(request.url)

	const cacheKey = new Request(cacheUrl.toString(), request)

	let response = await cache.match(cacheKey)

	if (!response) {

		let file = await env.BUCKET.get(key)

		if (!file) {
			return new Response("Not found", {
				status: 404,
			})
		}

		const payload = await file.body

		const metadata = file.httpMetadata.contentType || 'application/octet-stream'

		response = new Response(payload, {
			status: 200,
			headers: {
				'cache-control': 'max-age=31536000',
				'content-type': metadata,
				'etag': file.etag
			}
		})


		event.waitUntil(cache.put(event.request, response.clone()))
	}
	return response
})

router.delete('/:key', async (request, env) => {

    const { key }: any = request.params

    const file = await env.BUCKET.get(key)

    if (!file) {
        return new Response("Not found", {
            status: 404
        })
    }

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

export default {

	fetch: async (request: Request, env: Environment, event: Event) => router
		.handle(request, env, event)
		.catch(error => {
			return new Response(error.message, {
				status: error.status || 400,
			})
		})
		.then(response => {
			return response
		})
}
