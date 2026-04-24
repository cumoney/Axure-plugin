document.addEventListener('DOMContentLoaded', () => {
  const isEmbedded = new URLSearchParams(window.location.search).get('embedded') === '1';
  document.body.classList.toggle('is-embedded', isEmbedded);

  function reportEmbeddedSize() {
    if (!isEmbedded || !window.parent || window.parent === window) return;
    const height = Math.ceil(document.documentElement.scrollHeight);
    window.parent.postMessage({ source: 'axure-sync-embed', type: 'resize', height }, '*');
  }

  const toast = document.getElementById('toast');
  const projectSelectTrigger = document.getElementById('project-select-trigger');
  const projectSelectValue = document.getElementById('project-select-value');
  const projectDropdown = document.getElementById('project-dropdown');
  const projectEmptyState = document.getElementById('project-empty-state');
  const addProjectBtn = document.getElementById('add-project-btn');
  const newProjectForm = document.getElementById('new-project-form');
  const newProjectName = document.getElementById('new-project-name');
  const saveProjectBtn = document.getElementById('save-project-btn');
  const cancelProjectBtn = document.getElementById('cancel-project-btn');
  const shareProjectBtn = document.getElementById('share-project-btn');
  const deleteProjectBtn = document.getElementById('delete-project-btn');
  const uploadBtn = document.getElementById('upload-btn');
  const statusPanel = document.getElementById('status-panel');
  const statusEmpty = document.getElementById('status-empty');
  const progressArea = document.getElementById('progress-area');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const errorArea = document.getElementById('error-area');
  const errorText = document.getElementById('error-text');
  const statusLinkBox = document.getElementById('status-link-box');
  const shareLinkInput = document.getElementById('share-link');
  const copyBtn = document.getElementById('copy-btn');
  const settingsLink = document.getElementById('settings-link');
  const settingsModal = document.getElementById('settings-modal');
  const serverUrlInput = document.getElementById('server-url');
  const serverTokenInput = document.getElementById('server-token');
  const uploadConcurrencyInput = document.getElementById('upload-concurrency');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');

  let selectedProjectPath = '';
  let projects = [];
  let dropdownOpen = false;
  let toastTimer = null;

  // --- 初始化加载 ---
  async function init() {
    await loadSettings();
    await loadProjects();
    showIdleStatus();
    reportEmbeddedSize();
  }

  async function loadSettings() {
    const result = await chrome.storage.sync.get(['serverUrl', 'serverToken', 'uploadConcurrency']);
    if (result.serverUrl) serverUrlInput.value = result.serverUrl;
    if (result.serverToken) serverTokenInput.value = result.serverToken;
    const concurrency = Number(result.uploadConcurrency);
    uploadConcurrencyInput.value = Number.isFinite(concurrency) && concurrency > 0 ? String(concurrency) : '4';
  }

  async function loadProjects() {
    const result = await chrome.storage.sync.get(['projects', 'selectedProjectPath']);
    projects = result.projects || [];
    selectedProjectPath = result.selectedProjectPath || selectedProjectPath;
    if (!selectedProjectPath && projects.length > 0) {
      selectedProjectPath = projects[0].path;
    }
    renderProjectOptions();
  }

  async function persistSelectedProjectPath() {
    await chrome.storage.sync.set({ selectedProjectPath });
  }

  function renderProjectOptions() {
    projectDropdown.innerHTML = '';
    if (projects.length === 0) {
      selectedProjectPath = '';
      projectSelectValue.textContent = '暂无项目';
      projectSelectTrigger.disabled = true;
      shareProjectBtn.disabled = true;
      deleteProjectBtn.disabled = true;
      projectEmptyState.classList.remove('hidden');
      closeProjectDropdown();
      return;
    }

    projectEmptyState.classList.add('hidden');
    projectSelectTrigger.disabled = false;
    shareProjectBtn.disabled = false;
    deleteProjectBtn.disabled = false;

    if (!projects.some(p => p.path === selectedProjectPath)) {
      selectedProjectPath = projects[0].path;
    }

    projects.forEach((p) => {
      const optionBtn = document.createElement('button');
      optionBtn.type = 'button';
      optionBtn.className = `dropdown-option ${p.path === selectedProjectPath ? 'active' : ''}`;
      optionBtn.setAttribute('role', 'option');
      optionBtn.setAttribute('aria-selected', p.path === selectedProjectPath ? 'true' : 'false');
      optionBtn.textContent = p.name;
      optionBtn.onclick = async () => {
        selectedProjectPath = p.path;
        await persistSelectedProjectPath();
        renderProjectOptions();
        closeProjectDropdown();
      };
      projectDropdown.appendChild(optionBtn);
    });

    const selectedProject = projects.find(p => p.path === selectedProjectPath);
    projectSelectValue.textContent = selectedProject ? selectedProject.name : '请选择项目';
  }

  function encodeUrlPath(path) {
    return path
      .split('/')
      .filter(Boolean)
      .map(part => encodeURIComponent(part))
      .join('/');
  }

  function buildShareLink(path, entryPath = 'index.html') {
    const baseUrl = serverUrlInput.value.trim().replace(/\/$/, '');
    return `${baseUrl}/${encodeUrlPath(path)}/${encodeUrlPath(entryPath)}`;
  }

  function generateShareLink(path, entryPath = 'index.html') {
    const url = buildShareLink(path, entryPath);
    clearError();
    showSuccessStatus('同步完成，链接已生成');
    shareLinkInput.textContent = url;
    statusLinkBox.classList.remove('hidden');
  }

  function showError(message) {
    statusPanel.className = 'status-panel status-error';
    statusEmpty.classList.add('hidden');
    progressArea.classList.add('hidden');
    statusLinkBox.classList.add('hidden');
    errorText.textContent = message;
    errorArea.classList.remove('hidden');
  }

  function clearError() {
    errorText.textContent = '';
    errorArea.classList.add('hidden');
  }

  function showIdleStatus() {
    statusPanel.className = 'status-panel status-idle';
    statusEmpty.classList.remove('hidden');
    progressArea.classList.add('hidden');
    errorArea.classList.add('hidden');
    statusLinkBox.classList.add('hidden');
  }

  function showProgressStatus(text) {
    statusPanel.className = 'status-panel status-progress';
    statusEmpty.classList.add('hidden');
    errorArea.classList.add('hidden');
    statusLinkBox.classList.add('hidden');
    progressArea.classList.remove('hidden');
    if (text) progressText.textContent = text;
  }

  function showSuccessStatus(text) {
    statusPanel.className = 'status-panel status-success';
    statusEmpty.classList.add('hidden');
    errorArea.classList.add('hidden');
    progressArea.classList.remove('hidden');
    progressText.textContent = text;
    progressPercent.textContent = '100%';
    progressFill.style.width = '100%';
  }

  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hidden');
    }, 2000);
  }

  function copyText(text, successMessage, useToast = false) {
    if (!text) return;

    navigator.clipboard.writeText(text)
      .then(() => {
        if (useToast) {
          showToast(successMessage || '复制成功');
          return;
        }
        if (successMessage) {
          clearError();
          showSuccessStatus(successMessage);
          statusLinkBox.classList.add('hidden');
        }
        showToast('复制成功');
      })
      .catch(() => {
        showToast('复制失败');
      });
  }

  function copyShareLink() {
    const text = shareLinkInput.textContent || '';
    copyText(text);
  }

  function openProjectDropdown() {
    if (projectSelectTrigger.disabled || dropdownOpen) return;
    dropdownOpen = true;
    projectDropdown.classList.remove('hidden');
    projectSelectTrigger.setAttribute('aria-expanded', 'true');
    projectSelectTrigger.classList.add('open');
  }

  function closeProjectDropdown() {
    if (!dropdownOpen) return;
    dropdownOpen = false;
    projectDropdown.classList.add('hidden');
    projectSelectTrigger.setAttribute('aria-expanded', 'false');
    projectSelectTrigger.classList.remove('open');
  }

  async function deleteProject(index) {
    const project = projects[index];
    const serverUrl = serverUrlInput.value.trim();
    const serverToken = serverTokenInput.value.trim();

    if (!project) return;
    if (!serverUrl) {
      alert('请先配置服务器地址');
      return;
    }

    if (confirm(`确定删除“${project.name}”吗？服务器文件也会一起删除。`)) {
      try {
        const formData = new FormData();
        formData.append('path', project.path);
        formData.append('token', serverToken);

        const baseUrl = serverUrl.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/api/delete`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(`删除失败: ${response.status} ${message}`);
        }
      } catch (error) {
        alert(error.message);
        return;
      }

      projects.splice(index, 1);
      await chrome.storage.sync.set({ projects });
      if (projects.length > 0) {
        selectedProjectPath = projects[0].path;
      } else {
        selectedProjectPath = '';
      }
      await persistSelectedProjectPath();
      renderProjectOptions();
    }
  }

  // --- 事件监听 ---
  addProjectBtn.onclick = () => {
    clearError();
    newProjectForm.classList.remove('hidden');
    newProjectName.focus();
  };

  cancelProjectBtn.onclick = () => {
    clearError();
    newProjectForm.classList.add('hidden');
    newProjectName.value = '';
  };

  saveProjectBtn.onclick = async () => {
    const name = newProjectName.value.trim();
    if (!name) return;
    if (projects.some(p => p.name === name)) {
      alert('项目名已存在');
      return;
    }
    projects.push({ name, path: name });
    await chrome.storage.sync.set({ projects });
    selectedProjectPath = name;
    await persistSelectedProjectPath();
    newProjectForm.classList.add('hidden');
    newProjectName.value = '';
    renderProjectOptions();
    reportEmbeddedSize();
  };

  saveSettingsBtn.onclick = async () => {
    const uploadConcurrency = Math.min(12, Math.max(1, Number(uploadConcurrencyInput.value) || 4));
    uploadConcurrencyInput.value = String(uploadConcurrency);
    await chrome.storage.sync.set({
      serverUrl: serverUrlInput.value,
      serverToken: serverTokenInput.value,
      uploadConcurrency
    });
    settingsModal.classList.add('hidden');
    reportEmbeddedSize();
  };

  settingsLink.onclick = (e) => {
    e.preventDefault();
    settingsModal.classList.remove('hidden');
    reportEmbeddedSize();
  };

  closeSettingsBtn.onclick = () => {
    settingsModal.classList.add('hidden');
    reportEmbeddedSize();
  };

  projectSelectTrigger.onclick = () => {
    if (dropdownOpen) {
      closeProjectDropdown();
      return;
    }
    openProjectDropdown();
  };

  shareProjectBtn.onclick = () => {
    const project = projects.find(p => p.path === selectedProjectPath);
    if (!project) return;
    const url = buildShareLink(project.path, project.entryPath);
    copyText(url, '复制分享链接成功', true);
  };

  deleteProjectBtn.onclick = async () => {
    const index = projects.findIndex(p => p.path === selectedProjectPath);
    if (index === -1) return;
    await deleteProject(index);
  };

  document.addEventListener('click', (event) => {
    if (!dropdownOpen) return;
    if (projectSelectTrigger.contains(event.target) || projectDropdown.contains(event.target)) return;
    closeProjectDropdown();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProjectDropdown();
    }
  });

  copyBtn.onclick = copyShareLink;
  shareLinkInput.onclick = copyShareLink;

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action !== 'uploadProgress') return;

    if (message.statusText) {
      showProgressStatus(message.statusText);
      progressText.textContent = message.statusText;
      return;
    }

    showProgressStatus();
    progressPercent.textContent = `${message.percent}%`;
    progressFill.style.width = `${message.percent}%`;
    progressText.textContent = `同步中: ${message.percent}% (${message.current}/${message.total}) ${message.fileName}`;
  });

  uploadBtn.onclick = async () => {
    const serverUrl = serverUrlInput.value.trim();
    const serverToken = serverTokenInput.value.trim();
    const uploadConcurrency = Math.min(12, Math.max(1, Number(uploadConcurrencyInput.value) || 4));
    const mode = 'all';

    if (!serverUrl || !selectedProjectPath) {
      alert('请先配置服务器并选择一个项目');
      return;
    }

    uploadBtn.disabled = true;
    clearError();
    showProgressStatus('正在准备同步...');
    statusLinkBox.classList.add('hidden');
    progressPercent.textContent = '0%';
    progressFill.style.width = '0%';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const baseUrl = serverUrl.replace(/\/$/, '');
      progressText.textContent = '正在从 Axure 预览页查找原始文件...';
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'uploadProjectFiles',
        mode,
        concurrency: uploadConcurrency,
        projectPath: selectedProjectPath,
        uploadApi: `${baseUrl}/api/upload`,
        token: serverToken
      });

      if (!response || !response.success) {
        throw new Error(response && response.error ? response.error : '同步失败');
      }

      if (!response.files || response.files.length === 0) {
        throw new Error('未检测到 Axure 原型页面，请确认当前标签页打开的是 Axure 生成的预览页面');
      }

      const entryPath = response.entryPath || 'index.html';

      const project = projects.find(p => p.path === selectedProjectPath);
      if (project) {
        project.entryPath = entryPath;
        await chrome.storage.sync.set({ projects });
        renderProjectOptions();
      }

      progressText.textContent = '同步完成！';
      generateShareLink(selectedProjectPath, entryPath);

    } catch (err) {
      progressArea.classList.add('hidden');
      showError(err.message);
      console.error(err);
    } finally {
      uploadBtn.disabled = false;
      reportEmbeddedSize();
    }
  };

  if (isEmbedded && typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => reportEmbeddedSize());
    resizeObserver.observe(document.body);
  }

  init();
});
