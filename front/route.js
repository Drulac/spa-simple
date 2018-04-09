const setUrl = url => history.pushState({}, '', url)

const websocketServerUri =
	(location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host

let socket = new WebSocket(websocketServerUri)

const templateCache = {}

const req = url =>
	new Promise(async (resolve, reject) => {
		if (url in templateCache) {
			resolve(templateCache[url])
		} else {
			const request = new XMLHttpRequest()

			request.open('GET', url, true)
			request.send()
			request.onreadystatechange = () => {
				if (request.readyState === XMLHttpRequest.DONE) {
					if (request.status === 200) {
						templateCache[url] = request.response
						resolve(request.response)
					} else {
						reject(request.status)
					}
				}
			}
		}
	})

const include = async (uri, params, dt) => {
	console.time(`load ${uri}`)

	let [templateCode, data] = await Promise.all([
		req(`/${uri}.tpl`),
		dt ? new Promise(resolve => resolve(dt)) : socket.get(uri, params || null)
	])

	if ('redirect' in data) {
		setUrl(data.redirect)

		return await include(data.redirect, null)
	} else {
		data.include = async uri => {
			return include(uri, params, data)
		}

		const props = Object.getOwnPropertyNames(data)
		const func = new Function(
			...props,
			`return (async (strings, ...args)=>{

				args =	await (Promise.all(args))

				return strings.reduce((prev, curr, idx) => prev + curr + (args[idx] !== undefined ? args[idx] : ''), '');
			})\`${templateCode}\``
		)
		const args = props.map(prop => data[prop])

		console.timeEnd(`load ${uri}`)
		return func(...args)
	}
}

const parseArgs = () =>
	location.search
		.substr(1)
		.split('&')
		.map(e => e.split('='))
		.reduce(
			(result, [key, val]) =>
				key !== ''
					? val
						? Object.assign(result, {
								[key]: (val => {
									try {
										return JSON.parse(val)
									} catch (e) {
										return val
									}
								})(decodeURIComponent(val))
							})
						: Object.assign(result, {[key]: true})
					: result,
			{}
		)

const loadPage = async (uri, params) => {
	console.time(`loading ${uri.split('?')[0]}`)

	setUrl(uri)
	params = Object.assign(params || {}, parseArgs() || {})

	if (Object.values(params).length === 0) params = null

	uri = uri.split('?')[0]

	document.body.innerHTML = await include(uri, params)

	for (let child of document.body.childNodes) {
		if (child.localName === 'script') {
			if (child.src) {
				eval(await req(child.src))
			} else {
				eval(child.text || child.textContent || child.innerHTML || '')
			}
		}
	}

	console.timeEnd(`loading ${uri}`)
}

//preload
req(`/${window.location.pathname.substr(1)}.tpl`)

socket.onopen = async () => {
	const sock = new SocketWithOn(socket)
	socket = new Socket(sock)

	console.log(localStorage.getItem('id'))
	sock.write('loadId', localStorage.getItem('id'))

	sock.on('loadId', id => {
		localStorage.setItem('id', id)
		loadPage(window.location.pathname.substr(1) + window.location.search)
	})
}

const handleFormSend = function(self, uri) {
	const args = Array.from(self.childNodes)
		.filter(e => {
			return (
				(e instanceof HTMLInputElement && e.type != 'submit') || e instanceof HTMLTextAreaElement
			)
		})
		.reduce((sum, e) => {
			sum[e.name] = e.value
			return sum
		}, {})

	loadPage(uri, args)
	return false
}

const setTitle = function(title) {
	document.title = title
}
