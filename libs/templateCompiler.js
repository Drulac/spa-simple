module.exports = function(str){
	let ids = [];

	const possibleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const possibleCharsLen = possibleChars.length;
	const newID = length=>{
		let id = new Array(length)
		.fill(0)
		.map(()=>possibleChars
			.charAt(
				Math.floor(
					Math.random()*possibleCharsLen
				)
			)
		).join('');

		if(id in ids)
		{
			id = newID(length);
		}
		ids.push(id);
		return id;
	}

	const template = str
	.split('${')
	.reduce(
		(sum, e)=>sum.concat(e.split('}')),
		[]
	)
	.map((e, i)=>{
		if(i%2 === 0)
		{
			return e;
		}else{
			const id = newID(3);
			return `<tt id="${id}">${e}</tt>`;
		}
	})
	.join('');

	return [template, JSON.stringify(ids)];
};