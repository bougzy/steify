# 🎵 Stemify — AI Stem Separator

A full-stack music app that separates any song into individual stems using AI. Built with Next.js, MongoDB, and Demucs.

## Features

- **4-Stem Separation** — Vocals, Bass, Drums, Instruments
- **SATB Voice Detection** — Soprano, Alto, Tenor, Baritone
- **Key Modulation Detection** — Detects when a song changes key
- **BPM & Key Analysis** — Detect tempo and key signature
- **Per-Stem Controls** — Mute, Solo, Volume, Download each stem
- **Waveform Sync Player** — All stems play in perfect sync
- **Song Library** — Browse, replay, and delete past sessions
- **Fully Local** — No external APIs, everything runs on your machine

---

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | v18+ | https://nodejs.org |
| Python | 3.8+ | https://python.org |
| MongoDB | 6.0+ | https://mongodb.com/try/download/community |
| RAM | 4GB+ | 8GB recommended for Demucs |
| Storage | 2GB+ | For Demucs model (~300MB) + audio files |

---

## Installation

### Linux / macOS

```bash
# 1. Clone or extract the project folder
cd stemify

# 2. Run the automated installer
chmod +x install.sh
./install.sh

# 3. Start the app
npm run dev
```

### Windows

```batch
# 1. Open Command Prompt or PowerShell in the project folder
# 2. Run the installer
install.bat

# 3. Start the app
npm run dev
```

### Manual Installation (any OS)

```bash
# Step 1: Install Node dependencies
npm install

# Step 2: Install Python dependencies
pip install soundfile numpy scipy librosa demucs

# Step 3: Create upload directories
mkdir -p uploads/originals uploads/stems uploads/temp

# Step 4: Start MongoDB (if not already running)
# Linux/macOS:
mongod --dbpath /tmp/stemify-db --fork --logpath /tmp/mongod.log
# Windows: Start MongoDB from Services or run mongod.exe

# Step 5: Start the app
npm run dev
```

---

## Starting MongoDB

### macOS (Homebrew)
```bash
brew services start mongodb-community
```

### Ubuntu/Debian
```bash
sudo systemctl start mongod
sudo systemctl enable mongod   # auto-start on boot
```

### Windows
```batch
# Option A: Start as a service (if installed as service)
net start MongoDB

# Option B: Run manually
mongod --dbpath C:\data\db
```

### Verify MongoDB is running
```bash
mongosh --eval "db.runCommand({ connectionStatus: 1 })"
```

---

## Configuration

By default, Stemify connects to `mongodb://127.0.0.1:27017/stemify`.

To use a custom MongoDB URI (e.g., MongoDB Atlas), create a `.env.local` file:

```bash
# .env.local
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/stemify
```

---

## Running the App

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

### Production build

```bash
npm run build
npm start
```

---

## How It Works

### Processing Pipeline

```
Upload MP3/WAV/FLAC
       ↓
Next.js API (/api/upload)
  - Saves file to uploads/originals/
  - Creates MongoDB record
       ↓
Processing triggered (/api/process)
  - Spawns Python process
       ↓
Python Service (python-service/process.py)
  ┣━ Demucs AI Model
  ┃    → Separates: vocals, bass, drums, other
  ┃    → SATB split from vocals stem
  ┣━ librosa
  ┃    → Detects BPM
  ┃    → Detects key signature
  ┃    → Detects key modulations
  ┗━ Results saved to uploads/stems/<songId>/
       ↓
MongoDB updated with stem paths + analysis
       ↓
Player page streams stems via /api/stream
```

### Fallback Mode

If Demucs is not installed, the app uses a **SciPy-based spectral separation**:
- Vocals extracted via frequency bandpass (300Hz–3kHz)
- Bass extracted via low-pass filter (<300Hz)
- Instruments = remainder

Quality is lower than Demucs but the app remains fully functional.

---

## Directory Structure

```
stemify/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage / Upload
│   ├── player/
│   │   ├── page.tsx              # Player wrapper
│   │   └── PlayerClient.tsx      # Full stem player UI
│   ├── library/
│   │   └── page.tsx              # Song library
│   └── api/
│       ├── upload/route.ts       # File upload handler
│       ├── process/route.ts      # Triggers Python processing
│       ├── songs/
│       │   ├── route.ts          # List / delete songs
│       │   └── status/route.ts   # Poll processing status
│       ├── stream/route.ts       # Audio streaming with range support
│       └── stems/
│           └── download/route.ts # Stem download endpoint
├── lib/
│   ├── mongodb.ts                # DB connection
│   ├── models/Song.ts            # Mongoose schema
│   └── utils.ts                  # Shared helpers
├── python-service/
│   ├── process.py                # AI audio processing
│   └── requirements.txt          # Python deps
├── uploads/                      # Created at runtime
│   ├── originals/                # Uploaded audio files
│   ├── stems/                    # Separated stems
│   └── temp/                     # Temporary files
├── install.sh                    # Linux/macOS installer
├── install.bat                   # Windows installer
└── README.md
```

---

## Supported Audio Formats

| Format | Upload | Notes |
|--------|--------|-------|
| MP3 | ✅ | Most common, recommended |
| WAV | ✅ | Highest quality |
| FLAC | ✅ | Lossless compressed |
| OGG | ✅ | Open source format |
| M4A / AAC | ✅ | Apple/iTunes format |

**Maximum file size:** 200MB

---

## Stem Types

| Stem | Color | Description |
|------|-------|-------------|
| Vocals | Pink | Full vocal track |
| Soprano | Rose | High female voices (C4–C6) |
| Alto | Lavender | Low female / high male (G3–E5) |
| Tenor | Sky Blue | High male (C3–A4) |
| Baritone | Orange | Low male (E2–E4) |
| Bass | Purple | Bass instruments (20–300Hz) |
| Drums | Orange | Percussion tracks |
| Instruments | Cyan | All other instruments |

---

## Troubleshooting

### "MongoDB connection failed"
- Make sure MongoDB is running: `mongod --dbpath /tmp/stemify-db`
- Or set a custom URI in `.env.local`

### "Processing failed"
- Check Python is installed: `python3 --version`
- Check Python packages: `pip list | grep demucs`
- Reinstall Python deps: `pip install -r python-service/requirements.txt`

### "Demucs not found / low quality separation"
- Install Demucs manually: `pip install demucs`
- First run downloads the model (~300MB) — needs internet

### Stems out of sync
- Refresh the player page
- The app uses HTML5 Audio for sync — all stems are loaded before playback

### "File too large"
- Compress to MP3 320kbps
- Or increase the limit in `/app/api/upload/route.ts`

### Windows: Python not found
- Install Python from https://python.org
- Check "Add Python to PATH" during installation
- Restart Command Prompt after installation

---

## Privacy & Security

- **All processing is local** — no audio leaves your machine
- **No external APIs** — Demucs runs locally
- MongoDB stores only metadata (file paths, analysis results)
- Audio files are stored in `uploads/` on your local machine

---

## Credits

- **[Demucs](https://github.com/facebookresearch/demucs)** — Meta AI stem separation model
- **[librosa](https://librosa.org)** — Audio analysis (BPM, key, modulation)
- **[Next.js](https://nextjs.org)** — Full-stack React framework
- **[MongoDB](https://mongodb.com)** — Database

---

## License

MIT — use freely for personal and commercial projects.
