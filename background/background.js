chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'uploadFiles') {
    handleUpload(request.data)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleUpload(data) {
  const { url, files, token } = data;
  const results = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append('path', file.path);
    formData.append('content', file.content);
    if (token) {
      formData.append('token', token);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      results.push({ path: file.path, success: true, result });
    } catch (err) {
      results.push({ path: file.path, success: false, error: err.message });
    }
  }

  return results;
}