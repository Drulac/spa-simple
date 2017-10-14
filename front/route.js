const setUrl = url=>history.pushState({}, '', url);

var socket = new WebSocket(`ws://${window.location.hostname}:5000`);

const templateCache = {};

const req = (url, data)=>
new Promise(async (resolve, reject)=>{
	console.time('get '+url+' from network');
	if(url in templateCache)
	{
		console.timeEnd('get '+url+' from network');
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
					console.timeEnd('get '+url+' from network');
					resolve(request.response);
				}else{
					console.timeEnd('get '+url+' from network');
					reject(request.status);
				}
			}
		};
	}
});

const loadPage = async uri=>{
	console.time(uri);
	setUrl(uri);

	console.time('network requests');
	const [templateCode, data] = await Promise.all([
		req(uri+'.tpl'),
		new Promise(async (resolve, reject)=>{
			console.time('get '+uri+' from api socket');
			const data = await socket.get(uri, []);
			console.timeEnd('get '+uri+' from api socket');
			resolve(data);
		})
	]);
	console.timeEnd('network requests');

	console.log(data);

	console.time('func and data');
	const props = Object.getOwnPropertyNames(data);
	const func = new Function(...props, 'return `'+templateCode+'`');
	const args = props.map(prop=>data[prop]);
	console.timeEnd('func and data');

	console.time('set innerHTML');
	document.body.innerHTML = (func)(...args);
	console.timeEnd('set innerHTML');
	console.timeEnd(uri);
	console.log('-------------------');
};

socket.onopen = async ()=>{
	socket = new SocketWithOn(socket);
	socket = new Socket(socket);

	loadPage(window.location.pathname.substr(1));
};