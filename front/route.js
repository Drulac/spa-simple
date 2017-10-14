const setUrl = url=>history.pushState({}, '', url);

var socket = new WebSocket(`ws://${window.location.hostname}:5000`);

const templateCache = {};

const req = (url, data)=>
new Promise(async (resolve, reject)=>{
	if(url in templateCache)
	{
		resolve(templateCache[url]);
	}else{
		const request = new XMLHttpRequest();

		request.open('GET', `/${url}?${data}`, true);
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

const loadPage = async uri=>{
	setUrl(uri);

	const [templateCode, data] = await Promise.all([
		req(uri+'.tpl'),
		socket.get(uri, [])
	]);

	const props = Object.getOwnPropertyNames(data);
	const func = new Function(...props, 'return `'+templateCode+'`');
	const args = props.map(prop=>data[prop]);

	document.body.innerHTML = (func)(...args);
};

socket.onopen = async ()=>{
	socket = new SocketWithOn(socket);
	socket = new Socket(socket);

	loadPage(window.location.pathname.substr(1));
};