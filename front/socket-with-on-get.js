class EventEmitter
{
	constructor(){
		this._events = {};
		this._onces = {};
	}

	on(event, func){
		this._events[event] = func;
		delete this._onces[event];
	};

	once(event, func){
		this._onces[event] = func;
		delete this._events[event];
	};

	emit(event, data){
		if(this._events[event])
		{
			this._events[event](data);
		}else if(this._onces[event]){
			this._onces[event](data);
			delete this._onces[event];
		}
	};
};

class SocketWithOn extends EventEmitter{
	constructor (ws) {
		super();

		const areInNode = (typeof window === 'undefined');
		const write = ws.write !== undefined ? ws.write.bind(ws) : ws.send.bind(ws);

		this.write = (event, data)=>{
			write(JSON.stringify([event, data]));
		}

		const callEventMethod = ms=>{
			let msg = areInNode ? ms : ms.data;
			let [event, data] = JSON.parse(msg);

			this.emit(event, data);
		};

		if(areInNode)
		{
			ws.on('message', callEventMethod);
			ws.on('data', callEventMethod);
		}else{
			ws.onmessage = callEventMethod;
		}
	}
};

class Socket extends EventEmitter{
	constructor (socket) {
		super();
		this.ids = [];

		this.write = socket.write || socket.emit;

		const callEvent = ([id, value])=>{
			if(id in this.ids)
			{
				this.ids[id](value);
				delete this.ids[id]
			}
		};

		socket.on(1, callEvent);
		socket.on(2, callEvent);

		socket.on(0, ([id, event, args])=> {
			this.emit(event, args, data=>{
				this.write(1, [id, data]);
			}, err=>{
				this.write(2, [id, err]);
			});
		});

		this.socket = socket;
	}

	get (event, data){
		return new Promise(async (resolve, reject)=>{
			const newID = length=>{
				const id = Math.floor(Math.random() * parseInt('9'.repeat(length)))

				if(id in this.ids)
				{
					return newID(length);
				}
				return id;
			}

			const id = newID(3);

			this.ids[id] = resolve;

			this.write(0, [id, event, data])
		});
	};
}