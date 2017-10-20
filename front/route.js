const setUrl = url=>history.pushState({}, '', url);

let socket = new WebSocket(`ws://${window.location.hostname}:5000`);
//let socket = new WebSocket(`wss://0.tcp.ngrok.io:13924`);

const templateCache = {};

const req = (url)=>
new Promise(async (resolve, reject)=>{
	if(url in templateCache)
	{
		resolve(templateCache[url]);
	}else{
		const request = new XMLHttpRequest();

		request.open('GET', url, true);
		request.send();
		request.onreadystatechange = ()=>{
			if (request.readyState === XMLHttpRequest.DONE)
			{
				if(request.status === 200){
					templateCache[url] = request.response;
					resolve(request.response);
				}else{
					reject(request.status);
				}
			}
		};
	}
});

const include = async(uri, params, dt)=>{
	console.time(`load ${uri}`);

	let [templateCode, data] = await Promise.all([
		req(`/${uri}.tpl`),
		dt ? new Promise(resolve=>resolve(dt)) : socket.get(uri, params || null)
	]);

	data.include = async uri=>{
		return include(uri, params, data);
	};

	const props = Object.getOwnPropertyNames(data);
	const func = new Function(...props, `return (async (strings, ...args)=>{

		for(let id in args){
			if(args[id] instanceof Promise)
			{
				args[id] = await args[id].catch((err)=>{throw err});
			}
		}

		return strings.reduce((prev, curr, idx) => prev + curr + (args[idx] !== undefined ? args[idx] : ''), '');
	})\`${templateCode}\``);
	const args = props.map(prop=>data[prop]);

	console.timeEnd(`load ${uri}`);
	return (func)(...args);
}

const loadPage = async (uri, params)=>{
	console.time(`loading ${uri}`);

	setUrl(uri);

	document.body.innerHTML = await include(uri, params);

	for(let child of document.body.childNodes)
	{
		if(child.localName === 'script')
		{
			if(child.src)
			{
				eval(await req(child.src));
			}else{
				eval(child.text || child.textContent || child.innerHTML || "");
			}
		}
	}

	console.timeEnd(`loading ${uri}`);
};

socket.onopen = async ()=>{
	socket = new SocketWithOn(socket);
	socket = new Socket(socket);

	loadPage(window.location.pathname.substr(1));
};

const handleFormSend = function(self, uri)
{
	const args = Array.from(self.childNodes)
	.filter(e=>
		e instanceof HTMLInputElement && e.type != "submit"
	).reduce((sum, e)=>{
		sum[e.name] = e.value;
		return sum;
	}, {});

	console.log(args);

	loadPage(uri, args);
	return false;
}