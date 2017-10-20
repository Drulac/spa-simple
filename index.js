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
require('array-async-methods');

const contentTypes = {
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpg',
	'.wav': 'audio/wav'
}

const basePageDir = 'front/page.html';

class App{
	constructor(){
		this.templates = {};
		this.sockets = [];
		this.events = [];
		this.clients = [];
		this.initClient = ()=>({});
		this.baseCss = [];
		this.baseJs = [];
		this.staticFiles = [
			'front/lib.js',
			'front/route.js',
			'front/socket-with-on-get.js',
			'front/socket-with-on-get.min.js',
			'front/array-async-method.js'
		]
		.map(
			filePath=>{
				return [
					'/'+filePath,
					[
						contentTypes[path.extname(filePath)] || 'text/html',
						fs.readFileSync(path.resolve(__dirname, filePath), 'binary')
					]
				];
			}
		).reduce((sum, [route, content])=>{
			sum[route] = content;
			return sum;
		}, {});

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

			if(reqInfos.pathname in this.staticFiles){
				const [contentType, fileContent] = this.staticFiles[reqInfos.pathname];

				res.setHeader('Content-Type', contentType);
				res.setHeader('Cache-Control', 'only-if-cached, public, max-age=31536000');
				res.statusCode = 200;

				res.end(fileContent, 'binary');
			}else if(reqInfos.pathname in this.templates){
				const fileContent = this.templates[reqInfos.pathname];

				res.setHeader('Content-Type', 'text/html');

				res.setHeader('Cache-Control', 'only-if-cached, public, max-age=31536000');
				res.statusCode = 200;

				res.write(fileContent, 'utf-8');
				res.end();
			}else{
				const [contentType, fileContent] = this.staticFiles['/front/page.html'];

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

			this.clients[id] = this.initClient();

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

	compileBasePage(){
		this.staticFiles['/'+basePageDir] = [
			contentTypes[path.extname(basePageDir)] || 'text/html',
			(new Function('baseCSS', 'baseJS', 'return `'+fs.readFileSync(path.resolve(__dirname, basePageDir), 'utf8')+'`'))(this.baseCss, this.baseJs)
		];
	}

	setInitClient (cb){
		this.initClient = cb;
	}

	setBaseCss (routes){
		if(routes.length > 0)
		{
			this.baseCss = routes;
			this.compileBasePage();
		}
	}

	setBaseJs (route){
		if(route.length > 0)
		{
			this.baseJs = route;
			this.compileBasePage();
		}
	}

	addStaticFolder (folder){

		const getAllFilesFromFolder = function(dir) {
			var results = [];

			fs.readdirSync(dir).forEach(function(file) {

				file = dir+'/'+file;
				const stat = fs.statSync(file);

				if (stat && stat.isDirectory()) {
					results = results.concat(getAllFilesFromFolder(file))
				} else results.push(file);

			});

			return results;
		};

		folder = path.resolve(folder+'/');

		getAllFilesFromFolder(folder)
		.map(e=>[e.substr(folder.length), e])
		.map(
			([r, filePath])=>{
				return [
					r,
					[
						contentTypes[path.extname(filePath)] || 'text/html',
						fs.readFileSync(path.resolve(__dirname, filePath), 'binary')
					]
				];
			}
		).forEach(([route, content])=>{
			this.staticFiles[route] = content;
		});
	}

	on (fileName, cb){
		this.templates['/'+fileName+'.tpl'] = htmlMinifier(
			fs.readFileSync(
				this.templatesFolder+fileName+'.tpl',
				'utf8'
			)
			.replace(/action="([^"]+)/g, (m, uri)=>`onsubmit="return handleFormSend(this, '${uri}')`)
			.replace(/href="([^"]+)/g, (m, uri)=>`href="${uri}" onclick="loadPage('${uri}'); return false;`),
			{collapseWhitespace: true}
		);

		let self = this;

		const exec = async function(fn, args, user, next){
			let includes = [];
			let dt = await fn({form: args, user, include: uri=>includes.push(uri)});

			includes.forEachA(async uri=>{
				await (self.events.filter(([fileName, cb])=> fileName === uri))[0][1]
				.call(this, args, data=>{
					Object.assign(dt, data);
				});
			});

			next(dt);
		};

		const intercept = async function(args, resolve, reject){
			return await exec.call(this, cb, args, self.clients[self.sockets.indexOf(this)], resolve)
		};

		this.events.push([fileName, intercept]);
		this.events.forEach(
			([fileName, cb])=>
			this.sockets.forEach(
				socket=>socket.on(fileName, cb)
			)
		);
	}
}

module.exports = new App;