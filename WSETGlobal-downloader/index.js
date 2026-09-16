import yargs from "yargs";
import fetch from "node-fetch";
import PromptSync from "prompt-sync";
import { parseStringPromise as parseString } from "xml2js";
import PDFDocument from "pdfkit";
import SVGtoPDF from "svg-to-pdfkit";
import fs from "fs";

const argv = yargs(process.argv.slice(2))
	.option("username", {
		alias: "u",
		type: "string",
		description: "Username(email)",
	})
	.option("password", {
		alias: "p",
		type: "string",
		description: "Password",
	})
	.option("isbn", {
		alias: "i",
		type: "string",
		description: "ISBN",
	})
	.help()
	.alias("help", "h")
	.argv;

const prompt = PromptSync({ sigint: true });

PDFDocument.prototype.addSVG = function (svg, x, y, options) {
	return SVGtoPDF(this, svg, x, y, options), this;
};

(async () => {
    
    let {username: userName, password} = argv;

	while (!userName)
		userName = prompt("Username(email): ");

	while (!password)
		password = prompt("Password: ");

	console.log("Logging in...");

    const loginResponse = await fetch("https://wsetservices.kitaboo.eu/DistributionServices/services/api/reader/user/123/PC/authenticateUser", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            user:{
                userName,
                password,
            }
        })
    }).then((res) => res.json()).catch((err) => {
		console.log("Error: ", err);
		process.exit(1);
	});

    const usertoken = loginResponse.userToken;

    console.log(`Logged in as ${loginResponse.user.firstName} ${loginResponse.user.lastName}`);

    console.log("Fetching categories");

    const categoriesResponse = await fetch("https://wsetservices.kitaboo.eu/DistributionServices/services/api/reader/books/123/PC/books/categories?t=1761771924911", {
        headers: {
            usertoken,
        },
    }).then((res) => res.json());

    console.log("Loading bookshelf");

    let books = [];

    for (let category of categoriesResponse.categories) {
        const bookshelfResponse = await fetch("https://wsetservices.kitaboo.eu/DistributionServices/services/api/reader/books/123/PC/books/v2/categoryBookList", {
            headers: {
                usertoken,
                category_base64: btoa(category.name)
            },
        }).then((res) => res.json());

        books = [...books, ...bookshelfResponse.category.bookList.map(b => b.book)];
    }

    console.log("Available books:");
	console.table(books, ["isbn", "title"]);

	let isbn = argv.isbn;

    if (isbn != null && books.findIndex(b => b.isbn == isbn) == -1) {
        console.log("Book isbn not found");
        isbn = null;
    }

	while (!isbn) {
		isbn = prompt("ISBN: ");
        if (books.findIndex(b => b.isbn == isbn) == -1) {
            console.log("Book isbn not found");
            isbn = null;
        }
    }

    const book = books.find(b => b.isbn == isbn);

    console.log(`Downloading ${book.title}`);

    console.log("Requesting access to resource");

    const authenticateResponse = await fetch(`https://ebooks.wsetglobal.com/ContentServer/mvc/authenticatesp?packageId=${book.bookId}&ut=${usertoken}&ds=y`);

    const authorization = authenticateResponse.headers.get("Authorization");

    const bookSessionResponse = await fetch(`https://ebooks.wsetglobal.com/ContentServer/mvc/getSessionForBook?bookId=${book.bookId}`, {
        headers: {
            "Authorization": authorization,
        },
    });

    let readerCookies = bookSessionResponse.headers.raw()['set-cookie'].map((cookie) => cookie.split(';')[0]).join('; ');

    const downloadBookResponse = await fetch(`https://wsetservices.kitaboo.eu/DistributionServices/services/api/reader/distribution/123/html5/${book.id}/downloadBook?state=online`, {
        headers: {
            usertoken,
        },
    }).then(res => res.json());

    const rootUrl = downloadBookResponse.responseMsg;

    console.log("Fetching book index");

    const content = await fetch(rootUrl + "/OPS/content.opf", {
        headers: {
            "Cookie": readerCookies,
        },
    }).then(res => res.text()).then(parseString).catch((err) => {
		console.log("Error: ", err);
		process.exit(1);
	});

    let items = {};

	for (let item of content.package.manifest[0].item) {
		if (['image/svg+xml', 'image/png', 'image/jpeg'].includes(item.$['media-type'])) items[item.$.id] = item.$.href;
	}

	const doc = new PDFDocument();
	doc.pipe(fs.createWriteStream(book.title.replace(/[^a-z0-9]/gi, '_') + '.pdf'));

	for (let [i, itemref] of content.package.spine[0].itemref.entries()) {
		console.log(`Downloading ${itemref.$.idref}`);
		if (items[`images${itemref.$.idref}svgz`] !== undefined) {
			let svg = null;
			while (!svg) {
				const abortController = new AbortController();
				const promise = fetch(
					`${rootUrl}/OPS/${items[`images${itemref.$.idref}svgz`]}`,
					{ headers: {
						cookie: readerCookies 
					}, controller: abortController.signal }
				);
				const timeoutId = setTimeout(() => abortController.abort(), 10000);
				svg = await promise;
				clearTimeout(timeoutId);
			}
			doc.addSVG(await svg.text(), 0, 0, { preserveAspectRatio: "xMinYMin meet" });
		} else if (items[`images${itemref.$.idref}png`] !== undefined) {
			let png = null;
			while (!png) {
				const abortController = new AbortController();
				const promise = fetch(
					`${rootUrl}/OPS/${items[`images${itemref.$.idref}png`]}`,
					{ headers: {
						cookie: readerCookies
					}, controller: abortController.signal }
				);
				const timeoutId = setTimeout(() => abortController.abort(), 10000);
				png = await promise;
				clearTimeout(timeoutId);
			}
			doc.image(await png.arrayBuffer(), 0, 0, {fit: [doc.page.width, doc.page.height], align: 'center', valign: 'center'});
		} else if (items[`images${itemref.$.idref}jpg`] !== undefined) {
			let jpeg = null;
			while (!jpeg) {
				const abortController = new AbortController();
				const promise = fetch(
					`${rootUrl}/OPS/${items[`images${itemref.$.idref}jpg`]}`,
                    { headers: {
						cookie: readerCookies
					}, controller: abortController.signal }
				);
				const timeoutId = setTimeout(() => abortController.abort(), 5000)
				jpeg = await promise;
				clearTimeout(timeoutId);
			}
			doc.image(await jpeg.arrayBuffer(), 0, 0, {fit: [doc.page.width, doc.page.height], align: 'center', valign: 'center'});
		} else {
			console.log(`Unable to find suitable format for ${itemref.$.idref}`);
		}
		if (i < content.package.spine[0].itemref.length - 1) doc.addPage();
	}

	doc.end();
	console.log("Done! You'll find the PDF in the directory of the script");


})();