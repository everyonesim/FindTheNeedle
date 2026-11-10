// Reassembles the split Godot assets (index.pck, index.side.wasm) from their parts.
// Parts download in parallel with a look-ahead window, are stored in Cache Storage so
// later visits do not re-download them, and are streamed to the engine in order.
(() => {
	const ASSETS = {"index.pck":{"size":1759774166,"token":"e825cb062b0758c3","parts":[{"file":"index.pck.part000","size":18000000},{"file":"index.pck.part001","size":18000000},{"file":"index.pck.part002","size":18000000},{"file":"index.pck.part003","size":18000000},{"file":"index.pck.part004","size":18000000},{"file":"index.pck.part005","size":18000000},{"file":"index.pck.part006","size":18000000},{"file":"index.pck.part007","size":18000000},{"file":"index.pck.part008","size":18000000},{"file":"index.pck.part009","size":18000000},{"file":"index.pck.part010","size":18000000},{"file":"index.pck.part011","size":18000000},{"file":"index.pck.part012","size":18000000},{"file":"index.pck.part013","size":18000000},{"file":"index.pck.part014","size":18000000},{"file":"index.pck.part015","size":18000000},{"file":"index.pck.part016","size":18000000},{"file":"index.pck.part017","size":18000000},{"file":"index.pck.part018","size":18000000},{"file":"index.pck.part019","size":18000000},{"file":"index.pck.part020","size":18000000},{"file":"index.pck.part021","size":18000000},{"file":"index.pck.part022","size":18000000},{"file":"index.pck.part023","size":18000000},{"file":"index.pck.part024","size":18000000},{"file":"index.pck.part025","size":18000000},{"file":"index.pck.part026","size":18000000},{"file":"index.pck.part027","size":18000000},{"file":"index.pck.part028","size":18000000},{"file":"index.pck.part029","size":18000000},{"file":"index.pck.part030","size":18000000},{"file":"index.pck.part031","size":18000000},{"file":"index.pck.part032","size":18000000},{"file":"index.pck.part033","size":18000000},{"file":"index.pck.part034","size":18000000},{"file":"index.pck.part035","size":18000000},{"file":"index.pck.part036","size":18000000},{"file":"index.pck.part037","size":18000000},{"file":"index.pck.part038","size":18000000},{"file":"index.pck.part039","size":18000000},{"file":"index.pck.part040","size":18000000},{"file":"index.pck.part041","size":18000000},{"file":"index.pck.part042","size":18000000},{"file":"index.pck.part043","size":18000000},{"file":"index.pck.part044","size":18000000},{"file":"index.pck.part045","size":18000000},{"file":"index.pck.part046","size":18000000},{"file":"index.pck.part047","size":18000000},{"file":"index.pck.part048","size":18000000},{"file":"index.pck.part049","size":18000000},{"file":"index.pck.part050","size":18000000},{"file":"index.pck.part051","size":18000000},{"file":"index.pck.part052","size":18000000},{"file":"index.pck.part053","size":18000000},{"file":"index.pck.part054","size":18000000},{"file":"index.pck.part055","size":18000000},{"file":"index.pck.part056","size":18000000},{"file":"index.pck.part057","size":18000000},{"file":"index.pck.part058","size":18000000},{"file":"index.pck.part059","size":18000000},{"file":"index.pck.part060","size":18000000},{"file":"index.pck.part061","size":18000000},{"file":"index.pck.part062","size":18000000},{"file":"index.pck.part063","size":18000000},{"file":"index.pck.part064","size":18000000},{"file":"index.pck.part065","size":18000000},{"file":"index.pck.part066","size":18000000},{"file":"index.pck.part067","size":18000000},{"file":"index.pck.part068","size":18000000},{"file":"index.pck.part069","size":18000000},{"file":"index.pck.part070","size":18000000},{"file":"index.pck.part071","size":18000000},{"file":"index.pck.part072","size":18000000},{"file":"index.pck.part073","size":18000000},{"file":"index.pck.part074","size":18000000},{"file":"index.pck.part075","size":18000000},{"file":"index.pck.part076","size":18000000},{"file":"index.pck.part077","size":18000000},{"file":"index.pck.part078","size":18000000},{"file":"index.pck.part079","size":18000000},{"file":"index.pck.part080","size":18000000},{"file":"index.pck.part081","size":18000000},{"file":"index.pck.part082","size":18000000},{"file":"index.pck.part083","size":18000000},{"file":"index.pck.part084","size":18000000},{"file":"index.pck.part085","size":18000000},{"file":"index.pck.part086","size":18000000},{"file":"index.pck.part087","size":18000000},{"file":"index.pck.part088","size":18000000},{"file":"index.pck.part089","size":18000000},{"file":"index.pck.part090","size":18000000},{"file":"index.pck.part091","size":18000000},{"file":"index.pck.part092","size":18000000},{"file":"index.pck.part093","size":18000000},{"file":"index.pck.part094","size":18000000},{"file":"index.pck.part095","size":18000000},{"file":"index.pck.part096","size":18000000},{"file":"index.pck.part097","size":13774166}]},"index.side.wasm":{"size":44078870,"token":"e0c3b75ff009c54b","parts":[{"file":"index.side.wasm.part000","size":18000000},{"file":"index.side.wasm.part001","size":18000000},{"file":"index.side.wasm.part002","size":8078870}]}};
	const BASE = new URL('.', document.currentScript.src);
	const CACHE_NAME = 'ftn-pack-parts-v3';
	const CONCURRENCY = 6;
	const CACHE_WRITERS = 2;
	const RETRIES = 3;

	const nativeFetch = window.fetch.bind(window);
	const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

	const urls = {};
	for (const name of Object.keys(ASSETS)) {
		urls[name] = new URL(name, BASE).href;
	}

	let cachePromise = null;
	function openCache() {
		if (!cachePromise) {
			cachePromise = ('caches' in self)
				? caches.open(CACHE_NAME).catch(() => null)
				: Promise.resolve(null);
		}
		return cachePromise;
	}
	// Ask the browser to keep the parts around instead of evicting them later.
	try {
		if (navigator.storage && navigator.storage.persist) {
			navigator.storage.persist().catch(() => {});
		}
	} catch (error) { /* ignore */ }

	let writers = 0;
	const writeQueue = [];
	function takeWriter() {
		if (writers < CACHE_WRITERS) {
			writers++;
			return Promise.resolve();
		}
		return new Promise((resolve) => writeQueue.push(resolve));
	}
	function releaseWriter() {
		const next = writeQueue.shift();
		if (next) next(); else writers--;
	}

	async function readCached(url, size) {
		const cache = await openCache();
		if (!cache) return null;
		try {
			const hit = await cache.match(url, { ignoreVary: true });
			if (!hit) return null;
			const bytes = new Uint8Array(await hit.arrayBuffer());
			if (bytes.byteLength !== size) {
				cache.delete(url).catch(() => {});
				return null;
			}
			return bytes;
		} catch (error) {
			return null;
		}
	}

	async function writeCached(url, bytes) {
		const cache = await openCache();
		if (!cache) return;
		await takeWriter();
		try {
			await cache.put(url, new Response(bytes));
		} catch (error) {
			// Out of quota, private mode, etc. Loading still works without the cache.
		} finally {
			releaseWriter();
		}
	}

	async function download(part, url, signal) {
		let lastError;
		for (let attempt = 0; attempt <= RETRIES; attempt++) {
			try {
				const response = await nativeFetch(new Request(url, { credentials: 'same-origin', signal }));
				if (!response.ok) {
					throw new Error('Could not download ' + part.file + ': HTTP ' + response.status);
				}
				const bytes = new Uint8Array(await response.arrayBuffer());
				if (bytes.byteLength !== part.size) {
					throw new Error('Incomplete download: ' + part.file);
				}
				if (!signal || !signal.aborted) {
					writeCached(url, bytes).catch(() => {});
				}
				return bytes;
			} catch (error) {
				if (signal && signal.aborted) throw error;
				lastError = error;
				if (attempt < RETRIES) await sleep(250 * Math.pow(2, attempt));
			}
		}
		throw lastError;
	}

	window.fetch = async function (input, options) {
		const request = input instanceof Request ? input : null;
		let url;
		try {
			url = new URL(request ? request.url : String(input), document.baseURI);
		} catch (error) {
			return nativeFetch(input, options);
		}
		const name = Object.keys(ASSETS).find((key) => urls[key] === url.href || urls[key] === url.href.split('#')[0]);
		if (!name) return nativeFetch(input, options);

		const asset = ASSETS[name];
		const signal = (options && options.signal) || (request ? request.signal : undefined);
		const abort = new AbortController();
		let cancelled = false;
		const onAbort = () => { cancelled = true; abort.abort(); };
		if (signal) {
			if (signal.aborted) onAbort();
			else signal.addEventListener('abort', onAbort, { once: true });
		}

		const inflight = new Map();
		function load(index) {
			if (index >= asset.parts.length) return null;
			let job = inflight.get(index);
			if (job) return job;
			const part = asset.parts[index];
			const partUrl = new URL(part.file + '?v=' + asset.token, BASE).href;
			job = (async () => {
				const cached = await readCached(partUrl, part.size);
				if (cached) return cached;
				return download(part, partUrl, abort.signal);
			})();
			// Prefetched jobs are not awaited by anyone yet: absorb their rejection so a
			// cancelled load never surfaces as an unhandled promise rejection.
			job.catch(() => {});
			inflight.set(index, job);
			return job;
		}

		let index = 0;
		const stream = new ReadableStream({
			async pull(controller) {
				try {
					if (index >= asset.parts.length) {
						cleanup();
						controller.close();
						return;
					}
					// Start the next few parts now so they download while the engine consumes this one.
					const ahead = Math.min(index + CONCURRENCY, asset.parts.length);
					for (let i = index; i < ahead; i++) load(i);
					const bytes = await load(index);
					inflight.delete(index);
					index++;
					if (cancelled) throw abortError();
					controller.enqueue(bytes);
				} catch (error) {
					cleanup();
					try { controller.error(error); } catch (e) { /* stream already gone */ }
				}
			},
			cancel() {
				cancelled = true;
				cleanup();
			},
		});
		function abortError() {
			return new DOMException('The asset download was cancelled.', 'AbortError');
		}
		function cleanup() {
			if (signal) signal.removeEventListener('abort', onAbort);
			abort.abort();
			inflight.clear();
		}

		return new Response(stream, {
			headers: {
				'Content-Type': name.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream',
				'Content-Length': String(asset.size),
			},
		});
	};
})();
