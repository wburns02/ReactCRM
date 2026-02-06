#!/usr/bin/env python3
"""
Generate character reference set for IPAdapter
8 angles/expressions of the main character
"""

import json
import urllib.request
import time

COMFYUI_URL = "http://127.0.0.1:8188"

# Base character description
BASE_CHAR = "mid-30s athletic Caucasian man, short dark brown hair, rugged handsome features with light stubble, wearing a dark brown leather jacket over a black t-shirt"

NEGATIVE = "cartoon, anime, illustration, painting, drawing, blurry, low quality, distorted, ugly, deformed, watermark, text, logo, oversaturated, plastic skin, mannequin, extra limbs, bad anatomy"

# 8 reference angles/expressions
CHAR_REFS = [
    ("char_ref_01_front_neutral", f"Ultra photorealistic portrait photo of {BASE_CHAR}, front facing view, neutral calm expression, studio lighting, gray background, professional headshot, 8K, sharp details", 111),
    ("char_ref_02_front_happy", f"Ultra photorealistic portrait photo of {BASE_CHAR}, front facing view, slight smile, friendly expression, studio lighting, gray background, professional headshot, 8K, sharp details", 222),
    ("char_ref_03_front_terrified", f"Ultra photorealistic portrait photo of {BASE_CHAR}, front facing view, terrified expression, eyes wide with fear, mouth open, dramatic lighting, 8K, sharp details", 333),
    ("char_ref_04_front_intense", f"Ultra photorealistic portrait photo of {BASE_CHAR}, front facing view, intense serious expression, furrowed brow, dramatic lighting, 8K, sharp details", 444),
    ("char_ref_05_threequarter_left", f"Ultra photorealistic portrait photo of {BASE_CHAR}, three-quarter view facing left, neutral expression, studio lighting, gray background, 8K, sharp details", 555),
    ("char_ref_06_threequarter_right", f"Ultra photorealistic portrait photo of {BASE_CHAR}, three-quarter view facing right, neutral expression, studio lighting, gray background, 8K, sharp details", 666),
    ("char_ref_07_profile_left", f"Ultra photorealistic portrait photo of {BASE_CHAR}, side profile view facing left, neutral expression, studio lighting, gray background, 8K, sharp details", 777),
    ("char_ref_08_looking_up", f"Ultra photorealistic portrait photo of {BASE_CHAR}, face tilted upward looking at sky, awe and fear in expression, dramatic lighting from above, 8K, sharp details", 888),
]


def queue_flux(prompt, filename, seed, steps=25):
    workflow = {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "flux1-dev-fp8.safetensors", "weight_dtype": "fp8_e4m3fn"}},
        "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "clip_l.safetensors", "clip_name2": "t5xxl_fp8_e4m3fn.safetensors", "type": "flux"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "flux_ae.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": prompt}},
        "10": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": NEGATIVE}},
        "5": {"class_type": "EmptySD3LatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "6": {"class_type": "ModelSamplingFlux", "inputs": {"model": ["1", 0], "max_shift": 1.15, "base_shift": 0.5, "width": 1024, "height": 1024}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["6", 0], "positive": ["4", 0], "negative": ["10", 0], "latent_image": ["5", 0], "seed": seed, "steps": steps, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": filename}}
    }
    data = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read()).get("prompt_id")


def check_queue():
    try:
        req = urllib.request.Request(f"{COMFYUI_URL}/queue")
        resp = urllib.request.urlopen(req, timeout=10)
        q = json.loads(resp.read().decode())
        return len(q.get("queue_running", [])), len(q.get("queue_pending", []))
    except:
        return -1, -1


def wait_complete():
    while True:
        r, p = check_queue()
        if r == 0 and p == 0:
            return
        time.sleep(10)


def main():
    print("=" * 60)
    print("GENERATING CHARACTER REFERENCE SET")
    print("8 angles/expressions for IPAdapter")
    print("=" * 60)

    for i, (filename, prompt, seed) in enumerate(CHAR_REFS, 1):
        print(f"\n[{i}/8] {filename}")
        pid = queue_flux(prompt, filename, seed)
        print(f"  Queued: {pid}")
        wait_complete()
        print(f"  Complete!")

    print("\n" + "=" * 60)
    print("CHARACTER REFERENCE SET COMPLETE!")
    print("8 images ready for IPAdapter")
    print("=" * 60)


if __name__ == "__main__":
    main()
