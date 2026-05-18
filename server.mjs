import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.argv.includes('--prod');
const port = Number(process.env.PORT ?? 3000);
const dataDir = path.join(__dirname, '.data');
const stateFile = path.join(dataDir, 'queue-state.json');
const distDir = path.join(__dirname, 'dist');
const staleAfterMs = 60_000;

const defaultState = {
  version: 1,
  order: [],
  devices: {},
};

let queueState = await loadState();
let writeChain = Promise.resolve();

function withStateLock(task) {
  const next = writeChain.then(task, task);
  writeChain = next.then(() => undefined, () => undefined);
  return next;
}

async function loadState() {
  try {
    const raw = await fs.readFile(stateFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return structuredClone(defaultState);
    }
    return {
      version: 1,
      order: Array.isArray(parsed.order) ? parsed.order : [],
      devices: parsed.devices && typeof parsed.devices === 'object' ? parsed.devices : {},
    };
  } catch (error) {
    return structuredClone(defaultState);
  }
}

async function saveState(state) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2), 'utf-8');
}

function getQueuePosition(state, deviceId) {
  return state.order.findIndex((id) => id === deviceId) + 1;
}

function pruneStaleDevices(state) {
  const cutoff = Date.now() - staleAfterMs;
  state.order = state.order.filter((deviceId) => {
    const record = state.devices[deviceId];
    if (!record) {
      return false;
    }

    const lastSeen = Date.parse(record.lastSeen);
    if (Number.isNaN(lastSeen) || lastSeen < cutoff) {
      delete state.devices[deviceId];
      return false;
    }

    return true;
  });
}

function claimDevice(state, deviceId) {
  const now = new Date().toISOString();
  pruneStaleDevices(state);
  const existing = state.devices[deviceId];

  if (existing) {
    existing.lastSeen = now;
    return {
      deviceId,
      queuePosition: getQueuePosition(state, deviceId),
      totalDevices: state.order.length,
      assignedAt: existing.assignedAt,
      lastSeen: existing.lastSeen,
    };
  }

  const record = {
    assignedAt: now,
    lastSeen: now,
  };

  state.order.push(deviceId);
  state.devices[deviceId] = record;

  return {
    deviceId,
    queuePosition: getQueuePosition(state, deviceId),
    totalDevices: state.order.length,
    assignedAt: record.assignedAt,
    lastSeen: record.lastSeen,
  };
}

function assertDeviceId(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

const app = express();
app.use(express.json({ limit: '32kb' }));

app.get('/api/queue/state', async (req, res) => {
  const deviceId = assertDeviceId(req.query.deviceId);
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId is required' });
    return;
  }

  await withStateLock(async () => {
    pruneStaleDevices(queueState);
    const position = getQueuePosition(queueState, deviceId);
    if (position > 0) {
      queueState.devices[deviceId].lastSeen = new Date().toISOString();
    }

    res.json({
      deviceId,
      queuePosition: position > 0 ? position : null,
      totalDevices: queueState.order.length,
      assignedAt: position > 0 ? queueState.devices[deviceId].assignedAt : null,
      lastSeen: position > 0 ? queueState.devices[deviceId].lastSeen : null,
    });
  });
});

app.post('/api/queue/claim', async (req, res) => {
  const deviceId = assertDeviceId(req.body?.deviceId);
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId is required' });
    return;
  }

  await withStateLock(async () => {
    const result = claimDevice(queueState, deviceId);
    await saveState(queueState);
    res.json(result);
  });
});

if (isProd) {
  app.use(express.static(distDir, { index: false }));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  const vite = await createViteServer({
    appType: 'custom',
    server: {
      middlewareMode: true,
      hmr: true,
    },
  });

  app.use(vite.middlewares);
  app.use('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      let template = await fs.readFile(path.join(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (error) {
      next(error);
    }
  });
}

app.listen(port, () => {
  const mode = isProd ? 'production' : 'development';
  console.log(`Touming queue server running on http://localhost:${port} (${mode})`);
});
