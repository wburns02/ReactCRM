# Ultimate ComfyUI Character Identity Preservation Workflow

## Model Download List

### A. BASE GENERATION MODEL
| Model | Filename | Source |
|-------|----------|--------|
| RealVisXL V4.0 | `RealVisXL_V4.0.safetensors` | [CivitAI](https://civitai.com/models/139562/realvisxl-v40) |
| Location | `/home/will/ComfyUI/models/checkpoints/` | Already installed |

### B. IDENTITY LOCK MODELS (MANDATORY)
| Model | Filename | Source |
|-------|----------|--------|
| IPAdapter FaceID Plus V2 | `ip-adapter-faceid-plusv2_sdxl.bin` | [HuggingFace h94/IP-Adapter-FaceID](https://huggingface.co/h94/IP-Adapter-FaceID) |
| FaceID LoRA | `ip-adapter-faceid-plusv2_sdxl_lora.safetensors` | [HuggingFace h94/IP-Adapter-FaceID](https://huggingface.co/h94/IP-Adapter-FaceID) |
| InsightFace buffalo_l | `det_10g.onnx`, `w600k_r50.onnx`, etc. | Auto-downloaded via `pip install insightface` |

Locations:
- IPAdapter: `/home/will/ComfyUI/models/ipadapter/`
- LoRA: `/home/will/ComfyUI/models/loras/`
- InsightFace: `/home/will/ComfyUI/models/insightface/models/buffalo_l/`

### C. REFINEMENT MODEL
| Model | Filename | Source |
|-------|----------|--------|
| Flux.1 Dev FP8 | `flux1-dev-fp8.safetensors` | [HuggingFace](https://huggingface.co/Comfy-Org/flux1-dev) |
| Flux CLIP L | `clip_l.safetensors` | [HuggingFace](https://huggingface.co/comfyanonymous/flux_text_encoders) |
| Flux T5XXL FP8 | `t5xxl_fp8_e4m3fn.safetensors` | [HuggingFace](https://huggingface.co/comfyanonymous/flux_text_encoders) |

### D. VAE
| Model | Filename | Use |
|-------|----------|-----|
| SDXL VAE | Included in checkpoint | SDXL stages |
| Flux AE | `flux_ae.safetensors` | Flux stages |

---

## ComfyUI Node Graph (Step-by-Step)

### STAGE A: Identity Capture

**Node 1: LoadImagesFromFolderKJ**
- Folder: `/home/will/ComfyUI/input/character_refs`
- Load: 6 images (not all 19)
- Selection criteria: Front face, 3/4 face, neutral lighting, same outfit

**Node 3: IPAdapterInsightFaceLoader**
- Provider: `CUDA`
- Model: `buffalo_l`
- Purpose: Face detection and embedding extraction

### STAGE B: Photorealistic Generation (SDXL)

**Node 2: CheckpointLoaderSimple**
- Model: `RealVisXL_V4.0.safetensors`
- Why: Photorealistic bias, no artistic stylization

**Node 4: IPAdapterUnifiedLoaderFaceID**
- Preset: `FACEID PLUS V2`
- LoRA Strength: `0.75`
- Provider: `CUDA`

**Node 7: IPAdapterFaceID**
- Weight: `1.2` (strong identity lock)
- Weight FaceIDv2: `1.0`
- Weight Type: `linear`
- Combine Embeds: `norm average`
- Start At: `0.0`
- End At: `1.0`
- Embeds Scaling: `K+V`

**Node 9: KSampler (SDXL)**
- Steps: `35`
- CFG: `6.5`
- Sampler: `dpmpp_2m`
- Scheduler: `karras`
- Denoise: `1.0`

### STAGE C: Flux Texture Refinement

**Node 21: KSampler (Flux)**
- Steps: `15`
- CFG: `1.0`
- Sampler: `euler`
- Scheduler: `simple`
- Denoise: `0.20` (CRITICAL: Never exceed 0.25)

---

## Prompt Templates

### Positive Prompt (SDXL Stage)
```
Ultra photorealistic portrait of a [ETHNICITY] [GENDER] with [SKIN_TONE] skin,
[HAIR_COLOR] hair, authentic ethnicity preserved, professional studio photography
with soft lighting, highly detailed skin texture with visible pores, no makeup,
natural complexion, shot on medium format camera, 8K resolution, masterpiece quality,
sharp focus on facial features
```

**Example for Latina character:**
```
Ultra photorealistic portrait of a Latina woman with olive/tan skin, dark brown hair,
authentic ethnicity preserved, professional studio photography with soft lighting,
highly detailed skin texture with visible pores, no makeup, natural complexion,
shot on medium format camera, 8K resolution, masterpiece quality, sharp focus on facial features
```

### Negative Prompt (CRITICAL for preventing ethnicity drift)
```
white skin, pale skin, light skin, caucasian, european features, blonde hair,
red hair, blue eyes, green eyes, anime, cartoon, illustration, painting, fantasy,
unrealistic, deformed, ugly, blurry, low quality, watermark, text, logo
```

### Flux Prompt (Texture Only)
```
Add photorealistic skin texture with visible pores, enhance fine details,
professional studio photography lighting, keep exact same face and features,
8K quality enhancement
```

---

## Parameter Values Summary

| Parameter | SDXL Stage | Flux Stage |
|-----------|------------|------------|
| CFG | 6.5 | 1.0 |
| Steps | 35 | 15 |
| Sampler | dpmpp_2m | euler |
| Scheduler | karras | simple |
| Denoise | 1.0 | 0.20 (MAX 0.25) |
| FaceID Weight | 1.2 | N/A |
| FaceIDv2 Weight | 1.0 | N/A |
| Image Count | 6 refs | N/A |

---

## Common Failure Modes + Fixes

### 1. Ethnicity Drift (Face becomes Caucasian)
**Symptoms:** Generated face has lighter skin, European features
**Causes:**
- Missing ethnicity in positive prompt
- No skin tone blockers in negative prompt
- FaceID weight too low

**Fixes:**
- Add explicit ethnicity: "Latina woman with olive/tan skin"
- Add to negative: "white skin, pale skin, light skin, caucasian, european features"
- Increase FaceID weight to 1.2-1.5

### 2. Identity Loss (Face doesn't match reference)
**Symptoms:** Generic face, doesn't look like character
**Causes:**
- Using style-only IPAdapter
- Flux denoise too high
- Bad reference images

**Fixes:**
- Use FaceID Plus V2, NOT style IPAdapter
- Keep Flux denoise ≤ 0.20
- Select 6 best references (front face, neutral lighting)

### 3. Unrealistic Results (Anime/Cartoon look)
**Symptoms:** Stylized, not photorealistic
**Causes:**
- Wrong base model
- Missing negative prompt terms

**Fixes:**
- Use RealVisXL V4.0 or Juggernaut XL
- Add to negative: "anime, cartoon, illustration, painting, fantasy"

### 4. Hair Color Change
**Symptoms:** Character's brown hair becomes blonde/red
**Causes:**
- Model training bias
- Missing hair color in prompt

**Fixes:**
- Explicit hair color: "dark brown hair"
- Block wrong colors: "blonde hair, red hair"

### 5. Flux Destroys Identity
**Symptoms:** Good SDXL result, but Flux changes the face
**Causes:**
- Denoise > 0.25
- Identity-changing words in Flux prompt

**Fixes:**
- Keep denoise at 0.20 or lower
- Flux prompt should ONLY mention texture, never face features

---

## Success Criteria Checklist

- [ ] Generated face has same ethnicity as character
- [ ] Skin tone matches reference images
- [ ] Hair color is preserved
- [ ] Face is recognizably the same person
- [ ] No random westernized features
- [ ] Photorealistic quality (not stylized)
- [ ] Flux stage did not change identity

---

## Optional Upgrade Path: LoRA Training

For even stronger identity preservation:

1. **Collect Training Data**
   - 20-50 images of the character
   - Various angles, expressions, lighting
   - Consistent outfit helps

2. **Train SDXL LoRA**
   - Use Kohya_ss or similar
   - Train at 1024x1024
   - 500-1500 steps
   - Caption format: "photo of [name], [ethnicity] [gender], [features]"

3. **Combine with FaceID**
   - Apply trained LoRA (strength 0.6-0.8)
   - Plus FaceID (weight 0.8-1.0)
   - Result: Very strong identity lock

---

## Workflow File Location

Saved to: `/home/will/ComfyUI/user/default/workflows/character_faceid_identity.json`

Load in ComfyUI and adjust:
1. Reference image folder path
2. Ethnicity/features in prompts
3. FaceID weight based on results
