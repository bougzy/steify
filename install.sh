#!/usr/bin/env bash
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ███████╗████████╗███████╗███╗   ███╗██╗███████╗██╗   ██╗"
echo "  ██╔════╝╚══██╔══╝██╔════╝████╗ ████║██║██╔════╝╚██╗ ██╔╝"
echo "  ███████╗   ██║   █████╗  ██╔████╔██║██║█████╗   ╚████╔╝ "
echo "  ╚════██║   ██║   ██╔══╝  ██║╚██╔╝██║██║██╔══╝    ╚██╔╝  "
echo "  ███████║   ██║   ███████╗██║ ╚═╝ ██║██║██║        ██║   "
echo "  ╚══════╝   ╚═╝   ╚══════╝╚═╝     ╚═╝╚═╝╚═╝        ╚═╝   "
echo -e "${NC}"
echo -e "${CYAN}AI Stem Separator — Setup Script${NC}"
echo "============================================"

# Check Node.js
echo -e "\n${YELLOW}[1/5] Checking Node.js...${NC}"
if ! command -v node &>/dev/null; then
  echo -e "${RED}ERROR: Node.js not found. Install from https://nodejs.org (v18+)${NC}"
  exit 1
fi
NODE_VER=$(node --version)
echo -e "${GREEN}✓ Node.js ${NODE_VER}${NC}"

# Check Python
echo -e "\n${YELLOW}[2/5] Checking Python...${NC}"
PYTHON_CMD=""
for cmd in python3 python; do
  if command -v $cmd &>/dev/null; then
    VER=$($cmd --version 2>&1 | grep -o '[0-9]\+\.[0-9]\+' | head -1)
    MAJOR=$(echo $VER | cut -d. -f1)
    MINOR=$(echo $VER | cut -d. -f2)
    if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 8 ]; then
      PYTHON_CMD=$cmd
      echo -e "${GREEN}✓ Python $($cmd --version)${NC}"
      break
    fi
  fi
done

if [ -z "$PYTHON_CMD" ]; then
  echo -e "${RED}ERROR: Python 3.8+ not found. Install from https://python.org${NC}"
  exit 1
fi

# Check MongoDB
echo -e "\n${YELLOW}[3/5] Checking MongoDB...${NC}"
if command -v mongod &>/dev/null; then
  echo -e "${GREEN}✓ MongoDB found${NC}"
  # Try to start MongoDB if not running
  if ! pgrep mongod &>/dev/null; then
    echo "Starting MongoDB..."
    mongod --fork --logpath /tmp/mongod.log --dbpath /tmp/stemify-db 2>/dev/null || true
    mkdir -p /tmp/stemify-db
    mongod --fork --logpath /tmp/mongod.log --dbpath /tmp/stemify-db &>/dev/null || true
    sleep 2
  fi
  echo -e "${GREEN}✓ MongoDB running${NC}"
else
  echo -e "${YELLOW}⚠ MongoDB not found in PATH${NC}"
  echo "  If MongoDB is not running, the app will show a DB connection error."
  echo "  Install MongoDB: https://www.mongodb.com/try/download/community"
  echo "  OR use MongoDB Atlas (free tier) and set MONGODB_URI in .env.local"
fi

# Install Node packages
echo -e "\n${YELLOW}[4/5] Installing Node.js dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Node packages installed${NC}"

# Install Python packages
echo -e "\n${YELLOW}[5/5] Installing Python dependencies...${NC}"
echo "This may take several minutes (Demucs model is ~300MB)..."

$PYTHON_CMD -m pip install --upgrade pip --quiet

# Install in order of importance
echo "  Installing soundfile, numpy, scipy..."
$PYTHON_CMD -m pip install soundfile numpy scipy --quiet && echo -e "${GREEN}  ✓ Core audio libs${NC}"

echo "  Installing librosa..."
$PYTHON_CMD -m pip install librosa --quiet && echo -e "${GREEN}  ✓ librosa${NC}" || echo -e "${YELLOW}  ⚠ librosa failed (BPM/key detection degraded)${NC}"

echo "  Installing demucs (AI stem separation - ~300MB)..."
$PYTHON_CMD -m pip install demucs --quiet && echo -e "${GREEN}  ✓ Demucs installed${NC}" || echo -e "${YELLOW}  ⚠ Demucs failed - fallback separation will be used${NC}"

# Create uploads directory
mkdir -p uploads/originals uploads/stems uploads/temp

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ✓ Setup complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "To start Stemify, run:"
echo -e "  ${CYAN}npm run dev${NC}"
echo ""
echo -e "Then open: ${CYAN}http://localhost:3000${NC}"
echo ""
echo -e "${YELLOW}NOTE: First stem separation will download the Demucs model (~300MB)${NC}"
echo ""
