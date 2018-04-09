const httpRequest = new XMLHttpRequest();

httpRequest.open(
	"GET",
	`/api?page=${window.location.pathname.substr(1)}`,
	true
);
httpRequest.send();
httpRequest.responseType = "json";
httpRequest.onreadystatechange = () => {
	if (
		httpRequest.readyState === XMLHttpRequest.DONE &&
		httpRequest.status === 200
	) {
		const data = httpRequest.response;

		window.onload = () => {
			JSON.parse(
				document
					.getElementById("sZFLAITT")
					.getAttribute("data-ids")
					.replace(/'/g, '"')
			).forEach(id => {
				const e = document.getElementById(id);
				const code = e.innerHTML.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
				const props = Object.getOwnPropertyNames(data);

				e.outerHTML = new Function(...props, "return " + code)(
					...props.map(prop => data[prop])
				);
			});
		};

		document.readyState === "complete" ? window.onload() : "";
	}
};
