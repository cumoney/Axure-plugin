const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 2580;
const UPLOAD_BASE_DIR = 'D:\\nginx-1.16.1\\html\\eis';

app.use(cors());
app.use(express.static(UPLOAD_BASE_DIR));
app.use(express.json({limit: '200mb'}));
app.use(express.urlencoded({limit: '200mb', extended: true}));

const upload = multer({
  limits: {
    fileSize: 500 * 1024 * 1024
  }
});

function removePathSync(targetPath) {
  if (!fs.existsSync(targetPath)) return;

  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    fs.readdirSync(targetPath).forEach(name => {
      removePathSync(path.join(targetPath, name));
    });
    fs.rmdirSync(targetPath);
  } else {
    fs.unlinkSync(targetPath);
  }
}

function ensureDirSync(dirname) {
  const targetDir = path.resolve(dirname);
  const parsedPath = path.parse(targetDir);
  const parts = targetDir
    .slice(parsedPath.root.length)
    .split(path.sep)
    .filter(Boolean);
  let current = parsedPath.root;

  for (const part of parts) {
    current = path.join(current, part);

    if (!fs.existsSync(current)) {
      fs.mkdirSync(current);
      continue;
    }

    const stat = fs.statSync(current);
    if (stat.isDirectory()) continue;

    removePathSync(current);
    fs.mkdirSync(current);
    console.warn("目录冲突，已覆盖同名文件: " + current);
  }
}

function sanitizeRelativePath(filePath) {
  const cleanPath = filePath
    .split('?')[0]
    .split('#')[0]
    .replace(/\\/g, '/')
    .replace(/[*:"<>|]/g, '_');

  return cleanPath
    .split('/')
    .filter(part => part && part !== '.' && part !== '..')
    .join(path.sep);
}

function resolveUploadPath(filePath) {
  const baseDir = path.resolve(UPLOAD_BASE_DIR);
  const safePath = sanitizeRelativePath(filePath);
  const fullPath = path.resolve(baseDir, safePath);

  if (fullPath !== baseDir && !fullPath.startsWith(baseDir + path.sep)) {
    throw new Error('非法上传路径');
  }

  return { safePath, fullPath };
}

function decodeUploadContent(content) {
  if (typeof content !== 'string') return content;

  const dataUrlMatch = content.match(/^data:[^;]+;base64,(.+)$/);
  if (dataUrlMatch) {
    return Buffer.from(dataUrlMatch[1], 'base64');
  }

  return content;
}

app.post('/api/upload', upload.single('file'), (req, res) => {
  const filePath = req.body.path;
  const content = req.file ? req.file.buffer : decodeUploadContent(req.body.content);
  const token = req.body.token;

  if (token !== '112233') return res.status(401).send('Token 错误');
  if (!filePath || content === undefined) return res.status(400).send('缺少文件路径或文件内容');

  try {
    const { safePath, fullPath } = resolveUploadPath(filePath);
    const dir = path.dirname(fullPath);

    ensureDirSync(dir);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      removePathSync(fullPath);
    }
    fs.writeFileSync(fullPath, content);
    console.log("已同步: " + safePath);
    res.json({ success: true });
  } catch (error) {
    console.error("同步失败: " + filePath, error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/delete', upload.none(), (req, res) => {
  const projectPath = req.body.path;
  const token = req.body.token;

  if (token !== '112233') return res.status(401).send('Token 错误');
  if (!projectPath) return res.status(400).send('缺少项目路径');

  try {
    const { safePath, fullPath } = resolveUploadPath(projectPath);

    if (fs.existsSync(fullPath)) {
      removePathSync(fullPath);
      console.log("已删除: " + safePath);
    } else {
      console.log("删除跳过，不存在: " + safePath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("删除失败: " + projectPath, error.message);
    res.status(500).json({ message: error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log("Axure 原始文件同步服务器运行中...");
});
