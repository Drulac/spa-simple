Promise.prototype.mapA = Array.prototype.mapA = async function(p) {
	let self = this;
	if (self instanceof Promise) {
		self = await self;
	}

	return await Promise.all(
		self.map((currentValue, index, array) => p(currentValue, index, array))
	);
};

Promise.prototype.forEachA = Array.prototype.forEachA = async function(p) {
	let self = this;
	if (self instanceof Promise) {
		self = await self;
	}

	await self.mapA(p);
	return this;
};

Promise.prototype.filterA = Array.prototype.filterA = async function(p) {
	let self = this;
	if (self instanceof Promise) {
		self = await self;
	}

	const r = await Promise.all(self.map(e => p(e)));
	return self.reduce((sum, e, id) => {
		if (r[id] === true) {
			sum.push(e);
		}
	}, []);
};

Promise.prototype.reduceA = Array.prototype.reduceA = async function(
	p,
	initialValue
) {
	let self = this;
	if (self instanceof Promise) {
		self = await self;
	}

	let accumulator = initialValue || self[0];

	for (let e in self) {
		accumulator = await p(accumulator, self[e], e, self);
	}

	return accumulator;
};

Promise.prototype.reduceRightA = Array.prototype.reduceRightA = async function(
	p,
	initialValue
) {
	let self = this;
	if (self instanceof Promise) {
		self = await self;
	}

	return await self.reverse().reduceA(p, initialValue);
};

Promise.prototype.everyA = Array.prototype.everyA = async function(p) {
	let self = this;
	if (self instanceof Promise) {
		self = await self;
	}

	return (await self.filterA(p)).length === self.length;
};

Promise.prototype.someA = Array.prototype.someA = async function(p) {
	let self = this;
	if (self instanceof Promise) {
		self = await self;
	}

	return (await self.filterA(p)).length > 0;
};

Promise.prototype.findA = Array.prototype.findA = async function(p) {
	let self = this;
	if (self instanceof Promise) {
		self = await self;
	}

	return (await self.filterA(p))[0];
};

Promise.prototype.findIndexA = Array.prototype.findIndexA = async function(p) {
	let self = this;
	if (self instanceof Promise) {
		self = await self;
	}

	return self.indexOf((await self.findA(p))[0]);
};
