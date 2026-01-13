# ML Server Infrastructure Documentation

> **Last Updated:** January 12, 2026
> **Status:** Production Ready

---

## Overview

This document covers the complete setup of the ECBTX AI/ML infrastructure, consisting of two Dell PowerEdge R730 servers configured for distributed machine learning workloads.

---

## Server 1: ML Workstation (GPU Server)

### Hardware Specifications

| Component | Specification |
|-----------|---------------|
| **Model** | Dell PowerEdge R730 |
| **CPUs** | 2x Intel Xeon E5-2699 v4 (22 cores each, 44 cores / 88 threads total) |
| **RAM** | 768GB ECC DDR4 @ 1866MHz |
| **GPUs** | 2x NVIDIA GeForce RTX 3090 (24GB VRAM each, 48GB total) |
| **Storage** | 200GB NVMe (Samsung/WD) |
| **Network** | 4x 1GbE + Intel X520 10GbE SFP+ |
| **GPU Power** | Independent 1600W G+ PSU |

### Network Configuration

| Interface | IP Address | Purpose |
|-----------|------------|---------|
| Primary NIC | 192.168.7.71 | Main network access |
| iDRAC | 192.168.7.72 | Out-of-band management |
| 10GbE SFP+ (enp129s0f0) | 10.0.0.1/24 | Inter-server cluster link |

### Access Credentials

| Service | Address | Credentials |
|---------|---------|-------------|
| SSH | 192.168.7.71:22 | will / #Espn2025 |
| iDRAC | 192.168.7.72 | root / calvin |
| JupyterLab | http://192.168.7.71:8888 | token: ml-workstation-2025 |
| Ollama API | http://192.168.7.71:11434 | No auth required |

---

## Software Stack

### Operating System

- **OS:** Fedora Server 43
- **Desktop:** GNOME (for local access)
- **Kernel:** 6.17.1-300.fc43.x86_64 (6.18.x breaks tg3 network driver)

### Boot Configuration

The R730 cannot natively boot from NVMe. We use Clover bootloader:

```
Boot Chain: USB (Clover) → NVMe (Fedora)
```

**Clover USB Contents:**
- EFI/CLOVER/CLOVERX64.efi
- EFI/CLOVER/drivers/off/NvmExpressDxe.efi (provides NVMe support)

**Important:** The Clover USB must remain plugged in for the server to boot.

### NVIDIA Stack

| Component | Version |
|-----------|---------|
| NVIDIA Driver | 580.119.02 (from RPM Fusion) |
| CUDA Toolkit | 12.6 |
| cuDNN | Included with CUDA |

**Driver Installation Method:**
```bash
# RPM Fusion provides akmod-nvidia which auto-builds for each kernel
dnf5 install akmod-nvidia xorg-x11-drv-nvidia-cuda
akmods --force  # Force rebuild if needed
```

### Python ML Environment

**Conda Environment:** `ml` (Python 3.11)

```bash
# Activate
source ~/miniconda3/etc/profile.d/conda.sh
conda activate ml
```

**Installed Packages:**
| Package | Version | Purpose |
|---------|---------|---------|
| PyTorch | 2.6.0+cu124 | Deep learning framework |
| Transformers | Latest | Hugging Face models |
| scikit-learn | Latest | Traditional ML |
| pandas | Latest | Data manipulation |
| numpy | Latest | Numerical computing |
| matplotlib | Latest | Visualization |
| jupyterlab | 4.5.2 | Interactive notebooks |

### Ollama (Local LLMs)

**Version:** 0.13.5

**Service Status:**
```bash
systemctl status ollama
```

**API Endpoint:** http://192.168.7.71:11434

**Common Commands:**
```bash
# List models
ollama list

# Pull a model
ollama pull llama3.3:70b

# Run interactive
ollama run llama3.3

# API call
curl http://192.168.7.71:11434/api/generate -d '{
  "model": "llama3.3",
  "prompt": "Hello!"
}'
```

### JupyterLab

**URL:** http://192.168.7.71:8888
**Token:** ml-workstation-2025

**Systemd Service:** `~/.config/systemd/user/jupyterlab.service`

```bash
# Check status
systemctl --user status jupyterlab

# Restart
systemctl --user restart jupyterlab

# View logs
journalctl --user -u jupyterlab -f
```

**Configuration:** `~/.jupyter/jupyter_lab_config.py`

---

## BIOS Configuration (Critical for Dual GPUs)

These settings are **required** for dual RTX 3090 operation:

| Setting | Location | Value |
|---------|----------|-------|
| Memory Mapped I/O above 4GB | Integrated Devices | Enabled |
| Lower Memory Mapped I/O Base to 512G | Integrated Devices | **Enabled** |
| Embedded Video Controller | Integrated Devices | Disabled |
| System Profile | System Profile Settings | Performance |
| All PCIe Slots | Slot Disablement | Enabled |

**Warning:** Making multiple BIOS changes at once can cause the system to hang at "Loading BIOS drivers". Make changes ONE at a time and reboot between each.

**BIOS Recovery:** If BIOS becomes stuck, use the NVRAM_CLR jumper on the motherboard to reset to defaults.

---

## iDRAC Management

### Fan Control

```bash
# Set minimum fan speed (10%)
ssh root@192.168.7.72 "racadm set system.thermalsettings.MinimumFanSpeed 10"

# Set fan offset to minimum
ssh root@192.168.7.72 "racadm set system.thermalsettings.FanSpeedOffset 0"

# Set thermal profile (0 = minimum cooling)
ssh root@192.168.7.72 "racadm set system.thermalsettings.ThermalProfile 0"
```

### Power Operations

```bash
# Power cycle
ssh root@192.168.7.72 "racadm serveraction powercycle"

# Graceful shutdown
ssh root@192.168.7.72 "racadm serveraction graceshutdown"

# Power on
ssh root@192.168.7.72 "racadm serveraction powerup"
```

### BIOS Version

- **Current:** 2.19.0 (March 2024)
- **Previous:** 2.13.0 (available for rollback)

---

## Server 2: Compute Node (CPU/RAM Server)

### Hardware Specifications

| Component | Specification |
|-----------|---------------|
| **Model** | Dell PowerEdge R730 |
| **CPUs** | 2x Intel Xeon E5-2699 v4 (44 cores / 88 threads) |
| **RAM** | 768GB ECC DDR4 |
| **Storage** | SAS/SATA drives (cold storage) |
| **Network** | Intel X520 10GbE SFP+ |

### Planned Configuration

- **OS:** Fedora Server 43 (minimal, no GUI)
- **Purpose:** CPU preprocessing, large dataset handling, distributed computing
- **Connection:** 10GbE fiber link to ML server

### Cluster Setup (Ray)

```bash
# On ML Server (head node)
ray start --head --port=6379

# On Compute Server (worker)
ray start --address='192.168.7.71:6379'
```

---

## GPU Verification Commands

```bash
# Check GPU detection
nvidia-smi

# Detailed GPU info
nvidia-smi --query-gpu=index,name,pci.bus_id,memory.total,memory.free --format=csv

# PyTorch GPU check
python3 -c "
import torch
print(f'CUDA available: {torch.cuda.is_available()}')
print(f'GPU count: {torch.cuda.device_count()}')
for i in range(torch.cuda.device_count()):
    props = torch.cuda.get_device_properties(i)
    print(f'GPU {i}: {props.name} - {props.total_memory / 1024**3:.1f} GB')
"

# Monitor GPU usage
watch -n 1 nvidia-smi
```

---

## Troubleshooting

### GPU Not Detected

1. Check BIOS settings (especially "Lower Memory Mapped I/O Base to 512G")
2. Verify kernel has nvidia module: `lsmod | grep nvidia`
3. Check dmesg for errors: `dmesg | grep -i nvidia`
4. Rebuild nvidia module: `akmods --force`

### Network Not Working After Kernel Update

Kernel 6.18.x removed the `tg3` driver needed for Broadcom NICs:
```bash
# Set default to working kernel
grubby --set-default /boot/vmlinuz-6.17.1-300.fc43.x86_64
reboot
```

### Server Won't Boot (NVMe)

1. Ensure Clover USB is plugged in
2. At boot, press F11 for boot menu
3. Select the Clover USB entry (not the SanDisk U3 partition if present)
4. Clover should then boot Fedora from NVMe

### BIOS Stuck at "Loading BIOS drivers"

1. Wait 5-10 minutes (may be reinitializing PCIe)
2. If still stuck, use iDRAC to power cycle
3. If persists, use NVRAM_CLR jumper to reset BIOS defaults

### Fans Running at Max Speed

```bash
ssh root@192.168.7.72 "racadm set system.thermalsettings.MinimumFanSpeed 10"
ssh root@192.168.7.72 "racadm set system.thermalsettings.FanSpeedOffset 0"
```

---

## File Locations

| Item | Path |
|------|------|
| Conda | ~/miniconda3 |
| ML Environment | ~/miniconda3/envs/ml |
| JupyterLab Config | ~/.jupyter/jupyter_lab_config.py |
| JupyterLab Service | ~/.config/systemd/user/jupyterlab.service |
| ComfyUI Service | ~/.config/systemd/user/comfyui.service |
| CUDA | /usr/local/cuda-12.6 |
| Ollama Models | /usr/share/ollama/.ollama/models |
| ComfyUI | /data/comfyui |
| SAS Storage | /data (1.6TB XFS)

---

## Quick Start

```bash
# SSH to ML server
ssh will@192.168.7.71

# Activate ML environment
source ~/miniconda3/etc/profile.d/conda.sh
conda activate ml

# Check GPUs
nvidia-smi

# Start JupyterLab (if not running)
systemctl --user start jupyterlab

# Access JupyterLab
# Open browser to http://192.168.7.71:8888
# Token: ml-workstation-2025
```

---

## CRM Integration

The ML server provides AI capabilities for the ECBTX CRM via Tailscale Funnel:

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Ollama (Public) | https://localhost-0.tailad2d5f.ts.net | LLM inference via Tailscale Funnel |
| Ollama (Local) | http://192.168.7.71:11434 | LLM inference (local network) |
| Custom Models | TBD | Image/video generation |

### Railway Environment Variables (CRM Backend)

```env
AI_SERVER_URL=https://localhost-0.tailad2d5f.ts.net
AI_SERVER_ENABLED=true
```

### Tailscale Funnel Setup

The ML server uses Tailscale Funnel to expose Ollama publicly:

```bash
# Check status
tailscale funnel status

# Restart if needed
tailscale funnel --bg http://localhost:11434
```

### Available Models

| Model | Parameters | Size | Use Case |
|-------|------------|------|----------|
| llama3.2 | 3.2B | 2.0 GB | Fast responses, simple tasks |
| llama3.3:70b | 70.6B | 42 GB | High quality, complex reasoning |
| mistral:7b | 7.2B | 4.4 GB | General purpose, fast |
| codellama:13b | 13B | 7.4 GB | Code generation & analysis |
| deepseek-r1:8b | 8.2B | 5.2 GB | Reasoning tasks |
| phi3:mini | 3.8B | 2.2 GB | Efficient, fast inference |
| qwen2.5:7b | 7.6B | 4.7 GB | Multilingual, general purpose |
| nomic-embed-text | 137M | 274 MB | Text embeddings for RAG |
| llava:7b | 7B | 4.7 GB | Vision model (image analysis) |
| llava:13b | 13B | 8.0 GB | Vision model (higher quality) |
| gemma2:9b | 9B | 5.4 GB | Google's latest, high quality |
| starcoder2:7b | 7B | 4.0 GB | Code completion & generation |
| neural-chat:7b | 7B | 4.1 GB | Conversational AI |
| openchat:7b | 7B | 4.1 GB | Open conversation model |
| vicuna:13b | 13B | 7.4 GB | Instruction-following chat |
| sqlcoder:7b | 7B | 4.1 GB | SQL query generation |
| dolphin-mixtral:8x7b | 46.7B | 26 GB | Uncensored MoE model |

**Total Models:** 17 | **Total Size:** ~135 GB

---

## Generative AI Stack

### ComfyUI (Image Generation)

**URL:** http://192.168.7.71:8188

**Systemd Service:**
```bash
systemctl --user status comfyui
systemctl --user restart comfyui
```

**Models Installed:**

| Type | Model | Size |
|------|-------|------|
| Checkpoint | sd_xl_base_1.0.safetensors | 11 GB |
| Checkpoint | sd_xl_refiner_1.0.safetensors | 5.7 GB |
| VAE | sdxl_vae.safetensors | 320 MB |
| ControlNet | diffusers_xl_canny_full.safetensors | 2.4 GB |
| ControlNet | diffusers_xl_depth_full.safetensors | 2.4 GB |
| Upscaler | RealESRGAN_x4plus.pth | 64 MB |
| CLIP | clip_l.safetensors | 470 MB |
| LoRA | detail-tweaker-xl.safetensors | 163 MB |

**Total ComfyUI Models:** ~22 GB

**Custom Nodes Installed:**
- ComfyUI-Manager (node management)
- ComfyUI-Custom-Scripts (QoL improvements)
- ComfyUI_IPAdapter_plus (image-based prompting)
- ComfyUI-VideoHelperSuite (video generation)

**Model Directories:**
- Checkpoints: /data/comfyui/models/checkpoints/
- ControlNet: /data/comfyui/models/controlnet/
- LoRAs: /data/comfyui/models/loras/
- VAEs: /data/comfyui/models/vae/
- Upscalers: /data/comfyui/models/upscale_models/

### Audio Tools

**Whisper (Speech-to-Text):**
```python
import whisper
model = whisper.load_model("base")  # or "small", "medium", "large"
result = model.transcribe("audio.mp3")
print(result["text"])
```

**Bark TTS (Text-to-Speech):**
```python
from bark import SAMPLE_RATE, generate_audio
from scipy.io.wavfile import write

audio = generate_audio("Hello, this is a test.")
write("output.wav", SAMPLE_RATE, audio)
```

---

## Maintenance

### Regular Tasks

- **Weekly:** Check disk space, review logs
- **Monthly:** Update Fedora packages, update Ollama models
- **As Needed:** Update NVIDIA drivers (after kernel updates)

### Update Commands

```bash
# System updates
sudo dnf5 upgrade

# Ollama update
curl -fsSL https://ollama.com/install.sh | sh

# Python packages
conda activate ml
pip install --upgrade torch transformers
```

---

## Support

- **iDRAC Console:** https://192.168.7.72 (for remote KVM access)
- **Claude Code Session:** C:\Users\Will\.claude\projects\C--Users-Will-crm-work-ReactCRM\

