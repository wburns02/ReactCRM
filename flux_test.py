#!/usr/bin/env python3
"""
Flux.1 Dev Test - Generate sample images to verify setup
Uses: flux1-dev-fp8.safetensors + clip_l + t5xxl_fp8 + flux_ae VAE
"""

import json
import time
import urllib.request

COMFYUI_URL = "http://127.0.0.1:8188"

# Test prompts for Flux
TEST_PROMPTS = [
    "A serene mountain landscape at golden hour, photorealistic, 8K quality, dramatic lighting",
    "A futuristic cyberpunk cityscape at night with neon lights reflecting on wet streets",
    "A majestic white wolf in a snowy forest, wildlife photography, sharp detail"
]

def build_flux_workflow(prompt, output_name, seed=None, width=1024, height=1024):
    """Build Flux.1 Dev workflow for image generation"""
    if seed is None:
        seed = int(time.time() * 1000) % 2**31

    return {
        # Load UNET (Flux model)
        "1": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": "flux1-dev-fp8.safetensors",
                "weight_dtype": "fp8_e4m3fn"
            }
        },
        # Load Dual CLIP (CLIP-L + T5-XXL)
        "2": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": "clip_l.safetensors",
                "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
                "type": "flux"
            }
        },
        # Load VAE
        "3": {
            "class_type": "VAELoader",
            "inputs": {
                "vae_name": "flux_ae.safetensors"
            }
        },
        # CLIP Text Encode (positive)
        "4": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["2", 0],
                "text": prompt
            }
        },
        # Empty Latent Image
        "5": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": 1
            }
        },
        # Model Sampling for Flux
        "6": {
            "class_type": "ModelSamplingFlux",
            "inputs": {
                "model": ["1", 0],
                "max_shift": 1.15,
                "base_shift": 0.5,
                "width": width,
                "height": height
            }
        },
        # KSampler
        "7": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["6", 0],
                "positive": ["4", 0],
                "negative": ["4", 0],  # Flux doesn't use negative prompts
                "latent_image": ["5", 0],
                "seed": seed,
                "steps": 20,
                "cfg": 1.0,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1.0
            }
        },
        # VAE Decode
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "vae": ["3", 0],
                "samples": ["7", 0]
            }
        },
        # Save Image
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["8", 0],
                "filename_prefix": output_name
            }
        }
    }

def submit_workflow(workflow):
    data = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode()).get("prompt_id")

def wait_for_completion(prompt_id, timeout=600):
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(f"{COMFYUI_URL}/history/{prompt_id}")
            resp = urllib.request.urlopen(req, timeout=10)
            history = json.loads(resp.read().decode())
            if prompt_id in history:
                status = history[prompt_id].get("status", {})
                if status.get("completed", False):
                    return history[prompt_id]
                if status.get("status_str") == "error":
                    msgs = status.get('messages', [])
                    for m in msgs:
                        if isinstance(m, list) and len(m) > 1:
                            err_info = m[1] if isinstance(m[1], dict) else {}
                            if 'exception_message' in err_info:
                                print(f"\n  ERROR: {err_info['exception_message'][:300]}")
                    return None
        except Exception as e:
            pass
        print(".", end="", flush=True)
        time.sleep(2)
    print("\n  TIMEOUT!")
    return None

def test_flux():
    print("=" * 60)
    print("FLUX.1 DEV - TEST IMAGE GENERATION")
    print("=" * 60)
    print("Model: flux1-dev-fp8.safetensors")
    print("CLIP: clip_l.safetensors + t5xxl_fp8_e4m3fn.safetensors")
    print("VAE: flux_ae.safetensors")
    print("Resolution: 1024x1024")
    print("=" * 60 + "\n")

    for i, prompt in enumerate(TEST_PROMPTS, 1):
        print(f"[{i}/{len(TEST_PROMPTS)}] Generating test image...")
        print(f"  Prompt: {prompt[:60]}...")

        workflow = build_flux_workflow(
            prompt=prompt,
            output_name=f"flux_test_{i:02d}",
            seed=42 + i,
            width=1024,
            height=1024
        )

        try:
            prompt_id = submit_workflow(workflow)
            print(f"  Processing [{prompt_id[:8]}]", end="")
            result = wait_for_completion(prompt_id, timeout=300)
            if result:
                outputs = result.get("outputs", {})
                for node_out in outputs.values():
                    if "images" in node_out:
                        for img in node_out["images"]:
                            print(f" -> {img.get('filename')}")
                        break
                else:
                    print(" DONE")
            else:
                print(" FAILED")
        except Exception as e:
            print(f" ERROR: {e}")
        print()

    print("=" * 60)
    print("TEST COMPLETE!")
    print("Output: /home/will/ComfyUI/output/flux_test_*.png")
    print("=" * 60)

if __name__ == "__main__":
    test_flux()
