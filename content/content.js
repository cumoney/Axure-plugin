(function() {
  const EMBED_ROOT_ID = 'axure-sync-embed-root';
  const EMBED_STYLE_ID = 'axure-sync-embed-style';
  const EMBED_TOGGLE_ID = 'axure-sync-toggle';
  const EMBED_MODAL_ID = 'axure-sync-modal';
  const EMBED_IFRAME_ID = 'axure-sync-frame';
  const PAGE_URL = window.location.href;
  const TEXT_EXT_REGEX = /\.(html|css|js|json|xml)$/i;
  const BIN_EXT_REGEX = /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp)$/i;
  const ALLOWED_EXT_REGEX = /\.(html|css|js|json|xml|png|jpg|jpeg|gif|svg|ico|webp|bmp)(\?|#|$)/i;
  const PAGE_EXT_REGEX = /\.html(\?|#|$)/i;

  const pageUrlObj = new URL(PAGE_URL);
  const rootPath = pageUrlObj.pathname.substring(0, pageUrlObj.pathname.lastIndexOf('/') + 1);
  const rootUrl = new URL('./', pageUrlObj).href;

  function isLikelyAxurePage() {
    if (typeof window.$axure !== 'undefined') return true;
    if (document.querySelector('script[src*="axure"], script[src*="document.js"], script[src*="sitemap.js"]')) return true;
    if (document.querySelector('img[src*="axure"], [class*="axure"], [id*="axure"]')) return true;
    return /(?:^|\/)(?:index|start|.+)\.html(?:[?#].*)?$/i.test(pageUrlObj.pathname);
  }

  function ensureEmbedStyles() {
    if (document.getElementById(EMBED_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = EMBED_STYLE_ID;
    style.textContent = `
      #${EMBED_ROOT_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        pointer-events: none;
        font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #${EMBED_TOGGLE_ID} {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        height: 32px;
        padding: 0 12px;
        border: 1px solid rgba(17, 17, 17, 0.14);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.96);
        color: #111111;
        box-shadow: 0 10px 24px rgba(17, 17, 17, 0.12);
        cursor: pointer;
        pointer-events: auto;
        transition: background 160ms ease, border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
      }

      #${EMBED_ROOT_ID}.is-floating #${EMBED_TOGGLE_ID} {
        position: fixed;
        top: 20px;
        right: 150px;
      }

      #${EMBED_TOGGLE_ID}:hover {
        border-color: rgba(17, 17, 17, 0.24);
        background: #ffffff;
        transform: translateY(-1px);
      }

      #${EMBED_TOGGLE_ID}:focus-visible,
      #${EMBED_ROOT_ID} button:focus-visible {
        outline: none;
        box-shadow: 0 0 0 4px rgba(17, 17, 17, 0.16);
      }

      #${EMBED_TOGGLE_ID} svg,
      #${EMBED_ROOT_ID} svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      #${EMBED_MODAL_ID} {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(17, 17, 17, 0.28);
        backdrop-filter: blur(4px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 180ms ease;
      }

      #${EMBED_MODAL_ID}.is-open {
        opacity: 1;
        pointer-events: auto;
      }

      #${EMBED_MODAL_ID} .axure-sync-modal-card {
        position: relative;
        width: min(860px, calc(100vw - 48px));
        aspect-ratio: 4 / 3;
        max-height: calc(100vh - 48px);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 28px 80px rgba(17, 17, 17, 0.24);
        background: #f7f7f5;
      }

      #${EMBED_MODAL_ID} .axure-sync-modal-close {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 1;
        width: 30px;
        height: 30px;
        border: 1px solid rgba(17, 17, 17, 0.12);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.9);
        color: #111111;
        cursor: pointer;
      }

      #${EMBED_IFRAME_ID} {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: transparent;
      }

      @media (max-width: 900px) {
        #${EMBED_ROOT_ID}.is-floating #${EMBED_TOGGLE_ID} {
          right: 128px;
        }
      }

      @media (max-width: 720px) {
        #${EMBED_MODAL_ID} {
          padding: 12px;
        }

        #${EMBED_MODAL_ID} .axure-sync-modal-card {
          width: min(100vw - 24px, 560px);
          aspect-ratio: auto;
          height: min(100vh - 24px, 720px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function findToolbarHost() {
    const preferredAnchors = Array.from(document.querySelectorAll('img, svg, span, div, a'))
      .filter(node => /axure/i.test((node.getAttribute('alt') || node.getAttribute('aria-label') || node.textContent || '').trim()))
      .map(node => node.closest('header, nav, [role="toolbar"], [class], [id]'))
      .filter(Boolean);

    for (const anchor of preferredAnchors) {
      const rect = anchor.getBoundingClientRect();
      if (rect.top < 120 && rect.height >= 28 && rect.width > 240) {
        return anchor;
      }
    }

    const candidates = Array.from(document.querySelectorAll('header, nav, [role="toolbar"], div'))
      .filter(node => {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        const rect = node.getBoundingClientRect();
        return rect.top < 120
          && rect.height >= 28
          && rect.width > 280
          && (text.includes('100%') || /axure/i.test(text));
      })
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    return candidates[0] || null;
  }

  function mountToggle(root, toggle) {
    const toolbarHost = findToolbarHost();
    if (!toolbarHost) {
      root.classList.add('is-floating');
      document.documentElement.appendChild(root);
      return;
    }

    root.classList.remove('is-floating');
    document.documentElement.appendChild(root);

    const hostChildren = Array.from(toolbarHost.children);
    const axureBrand = hostChildren.find(child => /axure/i.test((child.textContent || child.getAttribute('aria-label') || '').trim()));
    const insertBefore = axureBrand || null;
    toolbarHost.insertBefore(toggle, insertBefore);
  }

  function createEmbeddedLauncher() {
    if (!isLikelyAxurePage()) return;
    if (document.getElementById(EMBED_ROOT_ID)) return;
    ensureEmbedStyles();

    const root = document.createElement('div');
    root.id = EMBED_ROOT_ID;
    root.innerHTML = `
      <button id="${EMBED_TOGGLE_ID}" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="${EMBED_MODAL_ID}">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>
        </svg>
        <span>上传</span>
      </button>
      <div id="${EMBED_MODAL_ID}" role="dialog" aria-modal="true" aria-label="Axure 原型同步">
        <div class="axure-sync-modal-card">
          <button class="axure-sync-modal-close" type="button" aria-label="关闭">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
          <iframe
            id="${EMBED_IFRAME_ID}"
            title="Axure 原型同步"
            src="${chrome.runtime.getURL('popup/popup.html?embedded=1')}">
          </iframe>
        </div>
      </div>
    `;
    const toggle = root.querySelector('#' + EMBED_TOGGLE_ID);
    const modal = root.querySelector('#' + EMBED_MODAL_ID);
    const closeBtn = root.querySelector('.axure-sync-modal-close');
    mountToggle(root, toggle);

    function openModal() {
      modal.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.documentElement.style.overflow = 'hidden';
    }

    function closeModal() {
      modal.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.documentElement.style.overflow = '';
    }

    toggle.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    const observer = new MutationObserver(() => {
      if (root.classList.contains('is-floating')) {
        mountToggle(root, toggle);
      } else if (!toggle.isConnected || !document.contains(toggle)) {
        mountToggle(root, toggle);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function sanitizePath(p) {
    return decodePath(p).split('?')[0].split('#')[0].replace(/\\/g, '/').replace(/[*:"<>|]/g, '_');
  }

  function decodePath(p) {
    try {
      return decodeURIComponent(p);
    } catch (e) {
      return p;
    }
  }

  function decodeJsString(value) {
    return String(value || '')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\\//g, '/')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
  }

  function cleanCandidatePath(value) {
    return decodePath(decodeJsString(value).trim())
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/^\.\//, '');
  }

  function encodeProjectPath(p) {
    return p.split('/').map(part => encodeURIComponent(part)).join('/');
  }

  function isLocalPath(rawPath) {
    if (!rawPath) return false;
    const p = rawPath.trim();
    if (!p) return false;
    if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('//')) return false;
    if (p.startsWith('data:') || p.startsWith('javascript:') || p.startsWith('mailto:')) return false;
    return true;
  }

  function looksLikeAssetOrPage(rawPath) {
    return ALLOWED_EXT_REGEX.test(rawPath);
  }

  function extractQuotedPaths(text) {
    const found = new Set();
    const quoted = /["']([^"']+)["']/g;
    let match;
    while ((match = quoted.exec(text)) !== null) {
      const candidate = cleanCandidatePath(match[1]);
      if (isLocalPath(candidate) && looksLikeAssetOrPage(candidate)) {
        found.add(candidate);
      }
    }
    return Array.from(found);
  }

  function extractCssUrlPaths(text) {
    const found = new Set();
    const cssUrl = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
    let match;
    while ((match = cssUrl.exec(text)) !== null) {
      const candidate = cleanCandidatePath(match[2]);
      if (isLocalPath(candidate) && looksLikeAssetOrPage(candidate)) {
        found.add(candidate);
      }
    }
    return Array.from(found);
  }

  function extractAxureFieldPaths(text) {
    const found = new Set();
    const fieldPath = /\b(?:url|src|href)\s*[:=]\s*(['"]?)([^'",\s})]+)\1/g;
    let match;
    while ((match = fieldPath.exec(text)) !== null) {
      const candidate = cleanCandidatePath(match[2]);
      if (isLocalPath(candidate) && looksLikeAssetOrPage(candidate)) {
        found.add(candidate);
      }
    }
    return Array.from(found);
  }

  function extractBareFilePaths(text) {
    const found = new Set();
    const barePath = /(?:^|[\s"'(])((?:\.\.?\/)?[^\s"'()<>]+?\.(?:html|css|js|json|xml|png|jpe?g|gif|svg|ico|webp|bmp)(?:[?#][^\s"'()<>]*)?)/gi;
    let match;
    while ((match = barePath.exec(text)) !== null) {
      const candidate = cleanCandidatePath(match[1]);
      if (isLocalPath(candidate) && looksLikeAssetOrPage(candidate)) {
        found.add(candidate);
      }
    }
    return Array.from(found);
  }

  function extractAxurePageUrls(text) {
    const found = new Set();
    const normalizedText = decodeJsString(text);
    const pageUrl = /["']?(?:url|target|pageUrl|page_url)["']?\s*:\s*(['"])(.*?)\1/g;
    const pageName = /["']?(?:pageName|name)["']?\s*:\s*(['"])(.*?)\1/g;
    const anyHtmlString = /(['"])([^'"]+?\.html(?:[?#][^'"]*)?)\1/g;
    let match;
    while ((match = pageUrl.exec(normalizedText)) !== null) {
      const candidate = cleanCandidatePath(match[2]);
      if (isLocalPath(candidate) && PAGE_EXT_REGEX.test(candidate)) {
        found.add(candidate);
      }
    }
    while ((match = anyHtmlString.exec(normalizedText)) !== null) {
      const candidate = cleanCandidatePath(match[2]);
      if (isLocalPath(candidate) && PAGE_EXT_REGEX.test(candidate) && !candidate.includes('resources/')) {
        found.add(candidate);
      }
    }
    while ((match = pageName.exec(normalizedText)) !== null) {
      const name = cleanCandidatePath(match[2]);
      if (name && isLocalPath(name) && !looksLikeAssetOrPage(name)) {
        found.add(`${name}.html`);
      }
    }
    return Array.from(found);
  }

  function extractDomPaths() {
    const found = new Set();
    if (typeof document === 'undefined') return [];
    document.querySelectorAll('[src], [href]').forEach(el => {
      const candidate = el.getAttribute('src') || el.getAttribute('href');
      if (isLocalPath(candidate) && looksLikeAssetOrPage(candidate)) {
        found.add(candidate);
      }
    });
    return Array.from(found);
  }

  function extractPathsFromSitemapObject(sitemap) {
    const found = new Set();

    function visit(node) {
      if (!node || typeof node !== 'object') return;

      if (typeof node.url === 'string') {
        const url = cleanCandidatePath(node.url);
        if (isLocalPath(url) && PAGE_EXT_REGEX.test(url)) {
          found.add(url);
        }
      }

      if (typeof node.pageName === 'string') {
        const pageName = cleanCandidatePath(node.pageName);
        if (pageName && isLocalPath(pageName) && !looksLikeAssetOrPage(pageName)) {
          found.add(`${pageName}.html`);
        }
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
    }

    if (Array.isArray(sitemap && sitemap.rootNodes)) {
      sitemap.rootNodes.forEach(visit);
    } else {
      visit(sitemap);
    }

    return Array.from(found);
  }

  function parseAxureSitemapText(text) {
    return {
      rootNodes: extractAxurePageUrls(text).map(url => ({ url }))
    };
  }

  function readRuntimeSitemapPaths() {
    if (typeof document === 'undefined') return Promise.resolve([]);

    return new Promise(resolve => {
      const messageId = `axure-sync-${Date.now()}-${Math.random()}`;
      let done = false;

      function finish(paths) {
        if (done) return;
        done = true;
        window.removeEventListener('message', onMessage);
        resolve(Array.isArray(paths) ? paths : []);
      }

      function onMessage(event) {
        if (event.source !== window) return;
        const data = event.data || {};
        if (data.source !== 'axure-sync-sitemap' || data.id !== messageId) return;
        finish(data.paths);
      }

      window.addEventListener('message', onMessage);

      const script = document.createElement('script');
      script.textContent = `
        (function() {
          var paths = [];
          function walk(node) {
            if (!node || typeof node !== 'object') return;
            if (typeof node.url === 'string') paths.push(node.url);
            if (typeof node.pageName === 'string') paths.push(node.pageName + '.html');
            if (Array.isArray(node.children)) {
              for (var i = 0; i < node.children.length; i++) walk(node.children[i]);
            }
          }
          try {
            var sitemap = window.$axure && window.$axure.document && window.$axure.document.sitemap;
            if (!sitemap && window.sitemap) sitemap = window.sitemap;
            if (sitemap && Array.isArray(sitemap.rootNodes)) {
              for (var i = 0; i < sitemap.rootNodes.length; i++) walk(sitemap.rootNodes[i]);
            } else {
              walk(sitemap);
            }
          } catch (e) {}
          window.postMessage({ source: 'axure-sync-sitemap', id: ${JSON.stringify(messageId)}, paths: paths }, '*');
        })();
      `;
      (document.documentElement || document.head || document.body).appendChild(script);
      script.remove();

      setTimeout(() => finish([]), 150);
    });
  }

  function extractReferencedPaths(text) {
    return Array.from(new Set([
      ...extractAxurePageUrls(text),
      ...extractQuotedPaths(text),
      ...extractCssUrlPaths(text),
      ...extractAxureFieldPaths(text),
      ...extractBareFilePaths(text)
    ]));
  }

  function toProjectPath(url) {
    if (url.origin !== pageUrlObj.origin) return null;
    if (!url.pathname.startsWith(rootPath)) return null;
    const relativePath = url.pathname.substring(rootPath.length);
    if (!relativePath || relativePath.endsWith('/')) return null;
    const cleanPath = sanitizePath(relativePath);
    return looksLikeAssetOrPage(cleanPath) ? cleanPath : null;
  }

  function resolveProjectPath(rawPath, fromProjectPath) {
    if (!isLocalPath(rawPath) || !looksLikeAssetOrPage(rawPath)) return [];

    const candidates = new Set();
    const fromUrl = new URL(encodeProjectPath(fromProjectPath || ''), rootUrl);
    const currentRelative = toProjectPath(new URL(rawPath, fromUrl));
    const rootRelative = toProjectPath(new URL(rawPath, rootUrl));

    if (currentRelative) candidates.add(currentRelative);
    if (rootRelative) candidates.add(rootRelative);

    return Array.from(candidates);
  }

  async function fetchRaw(url, isText) {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      if (isText) return await response.text();
      return '';
    } catch (e) {
      return null;
    }
  }

  async function fetchFileBlob(filePath) {
    const response = await fetch(rootUrl + encodeProjectPath(filePath));
    if (!response.ok) {
      throw new Error(`读取失败: ${filePath} (${response.status})`);
    }
    return await response.blob();
  }

  async function runPool(items, limit, worker) {
    let index = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) {
        const currentIndex = index++;
        await worker(items[currentIndex], currentIndex);
      }
    });

    await Promise.all(workers);
  }

  function sendUploadProgress(payload) {
    try {
      chrome.runtime.sendMessage(Object.assign({ action: 'uploadProgress' }, payload));
    } catch (e) {}
  }

  function sendUploadStatus(text) {
    sendUploadProgress({ statusText: text });
  }

  async function collectProjectFiles(options = {}) {
    const mode = options.mode || 'all';
    const currentPage = toProjectPath(pageUrlObj);

    if (mode === 'current' && !currentPage) {
      return { files: [], entryPath: 'index.html' };
    }

    // 多入口种子，覆盖 Axure 常见导出结构
    const seedPaths = mode === 'current'
      ? [currentPage]
      : [
        'index.html',
        'start.html',
        'start_c_1.html',
        'start_with_pages.html',
        'data/sitemap.js',
        'scripts/sitemap.js',
        'data/document.js'
      ];

    if (mode !== 'current' && currentPage && !seedPaths.includes(currentPage)) {
      seedPaths.unshift(currentPage);
    }

    const queue = seedPaths.map(path => ({ path: sanitizePath(path), priority: PAGE_EXT_REGEX.test(path) ? 0 : 1 }));
    const queued = new Set(queue.map(item => item.path));
    const saved = new Set();
    const files = [];

    function enqueuePath(rawPath, fromProjectPath, priority) {
      for (const p of resolveProjectPath(rawPath, fromProjectPath)) {
        if (mode === 'current' && PAGE_EXT_REGEX.test(p) && p !== currentPage) {
          continue;
        }
        if (!queued.has(p) && !saved.has(p)) {
          queued.add(p);
          queue.push({ path: p, priority: priority ?? (PAGE_EXT_REGEX.test(p) ? 0 : 1) });
        }
      }
    }

    if (mode !== 'current') {
      for (const rawPath of extractDomPaths()) {
        enqueuePath(rawPath, currentPage || 'start.html');
      }
    }

    if (mode !== 'current') {
      const runtimeSitemapPaths = await readRuntimeSitemapPaths();
      for (const rawPath of runtimeSitemapPaths) {
        enqueuePath(rawPath, 'data/sitemap.js', 0);
      }
    }

    while (queue.length > 0) {
      queue.sort((a, b) => a.priority - b.priority);
      const item = queue.shift();
      const cleanPath = sanitizePath(item.path);
      if (saved.has(cleanPath)) continue;

      const extPath = cleanPath.toLowerCase();
      const isText = TEXT_EXT_REGEX.test(extPath) || extPath.endsWith('.html');
      const isBinary = BIN_EXT_REGEX.test(extPath);

      // 不是我们关心的文件类型则跳过
      if (!isText && !isBinary) continue;

      files.push({ name: cleanPath });
      saved.add(cleanPath);

      if (!isText) continue;

      const content = await fetchRaw(rootUrl + encodeProjectPath(cleanPath), true);
      if (content == null) continue;

      // 仅文本文件继续提取引用，递归发现剩余页面与资源
      const shouldExpandCurrentFile = !(mode === 'current' && (cleanPath.endsWith('sitemap.js') || cleanPath.endsWith('document.js')));
      const discovered = shouldExpandCurrentFile ? extractReferencedPaths(content) : [];
      for (const rawPath of discovered) {
        enqueuePath(rawPath, cleanPath);
      }

      if (mode !== 'current' && (cleanPath.endsWith('sitemap.js') || cleanPath.endsWith('document.js'))) {
        const sitemapLikePaths = extractPathsFromSitemapObject(parseAxureSitemapText(content));
        for (const rawPath of sitemapLikePaths) {
          enqueuePath(rawPath, cleanPath, 0);
        }
      }
    }

    const uploadedNames = new Set(files.map(file => file.name));
    const htmlFiles = files.map(file => file.name).filter(name => PAGE_EXT_REGEX.test(name));
    const entryPath = (
      currentPage && uploadedNames.has(currentPage) && currentPage
    ) || (
      uploadedNames.has('index.html') && 'index.html'
    ) || (
      uploadedNames.has('start.html') && 'start.html'
    ) || htmlFiles[0] || 'index.html';

    return { files, entryPath };
  }

  async function uploadProjectFiles(options) {
    const mode = options.mode === 'current' ? 'current' : 'all';
    const concurrency = Math.min(12, Math.max(1, Number(options.concurrency) || 4));
    sendUploadStatus(mode === 'current'
      ? '正在扫描当前 Axure 页面文件...'
      : '正在快速扫描 Axure 原型文件...'
    );
    const result = await collectProjectFiles({ mode });
    const files = result.files;
    const total = files.length;
    const projectPath = options.projectPath;
    const uploadApi = options.uploadApi;
    const token = options.token;

    if (!projectPath || !uploadApi) {
      throw new Error('缺少上传参数');
    }

    sendUploadStatus(`发现 ${total} 个文件，开始并发上传...`);
    let completed = 0;
    await runPool(files, concurrency, async (file) => {
      let blob;
      try {
        blob = await fetchFileBlob(file.name);
      } catch (error) {
        completed++;
        const percent = Math.round((completed / total) * 100);
        sendUploadProgress({
          percent,
          current: completed,
          total,
          fileName: `跳过: ${file.name}`
        });
        return;
      }

      const formData = new FormData();
      formData.append('path', `${projectPath}/${file.name}`);
      formData.append('file', blob, file.name.split('/').pop() || file.name);
      formData.append('token', token || '');

      const response = await fetch(uploadApi, { method: 'POST', body: formData });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(`同步失败: ${response.status} ${message}`);
      }

      completed++;
      const percent = Math.round((completed / total) * 100);
      sendUploadProgress({
        percent,
        current: completed,
        total,
        fileName: file.name
      });
    });

    return {
      detected: files.length > 0,
      files,
      entryPath: result.entryPath
    };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'detectAxure' || request.action === 'getProjectFiles') {
      collectProjectFiles().then(result => {
        sendResponse({
          detected: result.files.length > 0,
          files: result.files,
          entryPath: result.entryPath
        });
      });
    } else if (request.action === 'uploadProjectFiles') {
      uploadProjectFiles(request)
        .then(result => sendResponse({
          success: true,
          detected: result.detected,
          files: result.files,
          entryPath: result.entryPath
        }))
        .catch(error => sendResponse({
          success: false,
          error: error.message
        }));
    }
    return true;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createEmbeddedLauncher, { once: true });
  } else {
    createEmbeddedLauncher();
  }
})();
