const http = require('http');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const url = require('url');

const templateCompiler = require('./libs/templateCompiler.js');

const fs = require('then-fs');
const htmlMinifier = require('html-minifier').minify;
const WebSocketServer = require('uws').Server;
const SocketWithOn = require('uws-with-on.js');
const Socket = require('socket.io-with-get');

const contentTypes = {
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpg',
	'.wav': 'audio/wav'
}

const staticFiles = [
	'front/lib.js',
	'front/page.html',
	'front/route.js',
	'front/socket-with-on-get.js',
	'front/socket-with-on-get.min.js'
]
.map(
	filePath=>{
		return [
			'/'+filePath,
			[
				contentTypes[path.extname(filePath)] || 'text/html',
				fs.readFileSync(path.resolve(__dirname, filePath), 'utf8')
			]
		];
	}
).reduce((sum, [route, content])=>{
	sum[route] = content;
	return sum;
}, {});

class App{
	constructor(){
		this.templates = {};
		this.sockets = [];
		this.events = [];
		this.clients = [];
		this.init = {};

		this.errors = {
			404: res=>{
				res.writeHead(404);
				res.end('<!doctype html><html><head><meta charset="utf-8"></head><body>file not found<html><body>', 'utf-8');
			},
			500: res=>{
				res.writeHead(500);
				res.end('<!doctype html><html><head><meta charset="utf-8"></head><body>Sorry, check with the site admin for error: '+error.code+' ..\n<html><body>', 'utf-8');
			}
		}

		this.server = http.createServer((req, res)=>{
			const reqInfos = url.parse(req.url, true);

			if(reqInfos.pathname in staticFiles){
				const [contentType, fileContent] = staticFiles[reqInfos.pathname];

				res.setHeader('Content-Type', contentType);
				res.setHeader('Cache-Control', 'only-if-cached, public, max-age=31536000');
				res.statusCode = 200;

				res.write(fileContent, 'utf-8');
				res.end();
			}else if(reqInfos.pathname in this.templates){
				const fileContent = this.templates[reqInfos.pathname];

				res.setHeader('Content-Type', 'text/html');

				res.setHeader('Cache-Control', 'only-if-cached, public, max-age=31536000');
				res.statusCode = 200;

				res.write(fileContent, 'utf-8');
				res.end();
			}else{
				const [contentType, fileContent] = staticFiles['/front/page.html'];

				res.setHeader('Content-Type', contentType);
				res.setHeader('Cache-Control', 'only-if-cached, public, max-age=31536000');
				res.statusCode = 200;

				res.write(fileContent, 'utf-8');
				res.end();
			}
		})
		.on('clientError', (err, socket) => {
			socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
		});
	}

	listen (port){
		this.server.listen(port);

		const wss = new WebSocketServer({port: 5000});
		wss.on('connection', async (originalSocket)=>{
			const socket = new Socket(new SocketWithOn(originalSocket));

			const id = this.sockets.push(socket)-1;

			originalSocket.on('close', ()=>{
				this.sockets.splice(id, 1);
				this.clients.splice(id, 1);
			});

			this.clients[id] = Object.assign({}, this.init);

			this.events.forEach(
				([fileName, cb])=>
				this.sockets.forEach(
					socket=>socket.on(fileName, cb)
				)
			);
		});
	}

	setTemplatesFolder (folder){
		this.templatesFolder = path.resolve(folder)+'/';
	}

	on (fileName, cb){
		this.templates['/'+fileName+'.tpl'] = htmlMinifier(
			fs.readFileSync(
				this.templatesFolder+fileName+'.tpl',
				'utf8'
			),
			{collapseWhitespace: true}
		);

		let self = this;

		this.events.push([fileName, function(args, next){
			cb(args, self.clients[self.sockets.indexOf(this)], next);
		}]);
		this.events.forEach(
			([fileName, cb])=>
			this.sockets.forEach(
				socket=>socket.on(fileName, cb)
			)
		);
	}
}

module.exports = new App;