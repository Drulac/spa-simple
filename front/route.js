const setUrl = url=>history.pushState({}, '', url);

var socket = new WebSocket(`ws://${window.location.hostname}:5000`);

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

const loadPage = async (uri, params)=>{
	console.time(`loading ${uri}`)
	setUrl(uri);

	const [templateCode, data] = await Promise.all([
		req(`/${uri}.tpl`),
		socket.get(uri, params || [])
	]);

	const props = Object.getOwnPropertyNames(data);
	const func = new Function(...props, 'return `'+templateCode+'`');
	const args = props.map(prop=>data[prop]);

	document.body.innerHTML = (func)(...args);

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