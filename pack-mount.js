// Mounts the game package without ever holding all 1.7 GB of it in memory at once.
//
// The package is served as 98 gzipped parts (994 MB on the wire and in memory). The file
// Godot opens at /index.pck is a virtual node: when the engine reads a range, the one
// compressed block that covers it is inflated on demand and kept in a small LRU cache.
// Blocks the engine has moved past are dropped, so resident memory settles at the
// compressed package plus roughly 100 MB, instead of the whole 1.7 GB for the whole session.
(() => {
	const TOTAL = 1759774166;
	const BLOCK = 18000000;
	const COUNT = 98;
	const CACHE_BUDGET = 96 * 1024 * 1024;
	const CONCURRENCY = 6;
	const RETRIES = 3;
	const VERSION = 'e825cb062b0758c3';

	const parts = new Array(COUNT);
	const cache = new Map();
	let cacheBytes = 0;
	let inflated = 0;
	let evicted = 0;

	function blockSize(index) {
		return Math.min(BLOCK, TOTAL - index * BLOCK);
	}

	function partName(index) {
		return 'index.pck.part' + String(index).padStart(3, '0') + '.gz?v=' + VERSION;
	}

	async function fetchPart(index) {
		let lastError = null;
		for (let attempt = 0; attempt <= RETRIES; attempt++) {
			try {
				const response = await fetch(partName(index), { credentials: 'same-origin' });
				if (!response.ok) throw new Error(partName(index) + ': HTTP ' + response.status);
				const gz = new Uint8Array(await response.arrayBuffer());
				parts[index] = gz;
				return;
			} catch (error) {
				lastError = error;
				if (attempt < RETRIES) await new Promise((resolve) => setTimeout(resolve, 250 * Math.pow(2, attempt)));
			}
		}
		throw lastError || new Error('missing part ' + index);
	}

	async function downloadPack() {
		const progress = document.getElementById('status-progress');
		let next = 0;
		let done = 0;
		if (progress) {
			progress.value = 0;
			progress.max = COUNT;
		}
		async function worker() {
			for (;;) {
				const index = next++;
				if (index >= COUNT) return;
				await fetchPart(index);
				done++;
				if (progress) progress.value = done;
			}
		}
		const workers = [];
		for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
		await Promise.all(workers);
	}

	function block(index) {
		const cached = cache.get(index);
		if (cached) {
			cache.delete(index);
			cache.set(index, cached);
			return cached;
		}
		const inflate = (window.pako && window.pako.inflate) || null;
		if (!inflate) throw new Error('inflate unavailable');
		const raw = inflate(parts[index]);
		if (!raw || raw.length !== blockSize(index)) {
			throw new Error('bad block ' + index + ' (' + (raw ? raw.length : 0) + ' of ' + blockSize(index) + ')');
		}
		inflated++;
		cache.set(index, raw);
		cacheBytes += raw.length;
		while (cacheBytes > CACHE_BUDGET && cache.size > 1) {
			const oldest = cache.keys().next().value;
			cacheBytes -= cache.get(oldest).length;
			cache.delete(oldest);
			evicted++;
		}
		return raw;
	}

	function install(FS) {
		if (!FS || FS.__ftnPacked) return;
		FS.__ftnPacked = true;
		const originalRead = FS.read;
		FS.read = function (stream, buffer, offset, length, position) {
			const node = stream.node;
			if (!node || node.ftnPacked !== true) return originalRead.apply(FS, arguments);
			if (!length) return 0;
			if (position === undefined || position === null) position = stream.position;
			const available = TOTAL - position;
			if (available <= 0) return 0;
			const wanted = Math.min(length, available);
			let read = 0;
			while (read < wanted) {
				const at = position + read;
				const index = Math.floor(at / BLOCK);
				const within = at - index * BLOCK;
				const raw = block(index);
				const take = Math.min(wanted - read, raw.length - within);
				try {
					buffer.set(raw.subarray(within, within + take), offset + read);
				} catch (error) {
					return read;
				}
				read += take;
			}
			stream.position = position + read;
			return read;
		};
	}

	async function mount(engine) {
		await engine.init();
		const FS = window.__FTN_FS;
		if (!FS) throw new Error('no filesystem');
		await downloadPack();
		install(FS);
		const node = FS.create('/index.pck', 0o666);
		if (!node) throw new Error('no node');
		node.ftnPacked = true;
		node.usedBytes = TOTAL;
		node.contents = new Uint8Array(0);
		window.__ftnPackStats = function () {
			return { parts: COUNT, inflated: inflated, evicted: evicted, cacheBytes: cacheBytes };
		};
	}

	window.FTN_MOUNT_PACK = mount;
})();
