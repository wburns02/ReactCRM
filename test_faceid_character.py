#!/usr/bin/env python3
"""
Test FaceID Identity-Preserving Character Workflow
Generates photorealistic character from 6 reference images
Uses GPU 1 (port 8189)
"""

import json
import urllib.request
import time
import glob
import os

COMFYUI_URL = "http://127.0.0.1:8189"  # GPU 1
OUTPUT_DIR = "/home/will/ComfyUI/output"


def create_faceid_workflow(ref_folder, ethnicity_prompt, output_prefix, seed=12345):
    """Create FaceID + Flux workflow for identity-preserving character generation

    Args:
        ref_folder: Path to folder with 6 reference images
        ethnicity_prompt: Ethnicity description for prompt (e.g., "Latina woman with olive/tan skin")
        output_prefix: Output filename prefix
        seed: Random seed
    """

    positive_prompt = f"Ultra photorealistic portrait of a {ethnicity_prompt}, authentic ethnicity preserved, professional studio photography with soft lighting, highly detailed skin texture with visible pores, no makeup, natural complexion, shot on medium format camera, 8K resolution, masterpiece quality, sharp focus on facial features"

    negative_prompt = "white skin, pale skin, light skin, caucasian, european features, blonde hair, red hair, blue eyes, green eyes, anime, cartoon, illustration, painting, fantasy, unrealistic, deformed, ugly, blurry, low quality, watermark, text, logo"

    flux_prompt = "Add photorealistic skin texture with visible pores, enhance fine details, professional studio photography lighting, keep exact same face and features, 8K quality enhancement"

    return {
        # Load reference images (6 best ones)
        "1": {
            "class_type": "LoadImagesFromFolderKJ",
            "inputs": {
                "folder_path": ref_folder,
                "width": 1024,
                "height": 1024,
                "resize_method": "crop",
                "start_index": 0,
                "max_images": 6,
                "sort_by_modified": False
            }
        },

        # Load SDXL checkpoint
        "2": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": "RealVisXL_V4.0.safetensors"
            }
        },

        # Load InsightFace
        "3": {
            "class_type": "IPAdapterInsightFaceLoader",
            "inputs": {
                "provider": "CUDA",
                "model_name": "buffalo_l"
            }
        },

        # Load FaceID Plus V2
        "4": {
            "class_type": "IPAdapterUnifiedLoaderFaceID",
            "inputs": {
                "model": ["2", 0],
                "preset": "FACEID PLUS V2",
                "lora_strength": 0.75,
                "provider": "CUDA"
            }
        },

        # Positive prompt
        "5": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["2", 1],
                "text": positive_prompt
            }
        },

        # Negative prompt
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["2", 1],
                "text": negative_prompt
            }
        },

        # Apply FaceID
        "7": {
            "class_type": "IPAdapterFaceID",
            "inputs": {
                "model": ["4", 0],
                "ipadapter": ["4", 1],
                "image": ["1", 0],
                "insightface": ["3", 0],
                "weight": 1.2,
                "weight_faceidv2": 1.0,
                "weight_type": "linear",
                "combine_embeds": "norm average",
                "start_at": 0.0,
                "end_at": 1.0,
                "embeds_scaling": "K+V"
            }
        },

        # Empty latent
        "8": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": 1024,
                "height": 1024,
                "batch_size": 1
            }
        },

        # SDXL KSampler
        "9": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["7", 0],
                "positive": ["5", 0],
                "negative": ["6", 0],
                "latent_image": ["8", 0],
                "seed": seed,
                "control_after_generate": "randomize",
                "steps": 35,
                "cfg": 6.5,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 1.0
            }
        },

        # SDXL VAE Decode
        "10": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["9", 0],
                "vae": ["2", 2]
            }
        },

        # Save SDXL result
        "11": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["10", 0],
                "filename_prefix": f"{output_prefix}_sdxl"
            }
        },

        # Load Flux
        "15": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": "flux1-dev-fp8.safetensors",
                "weight_dtype": "fp8_e4m3fn"
            }
        },

        # Load Flux CLIP
        "16": {
            "class_type": "DualCLIPLoader",
            "inputs": {
                "clip_name1": "clip_l.safetensors",
                "clip_name2": "t5xxl_fp8_e4m3fn.safetensors",
                "type": "flux"
            }
        },

        # Load Flux VAE
        "17": {
            "class_type": "VAELoader",
            "inputs": {
                "vae_name": "flux_ae.safetensors"
            }
        },

        # Flux prompt (texture only)
        "18": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["16", 0],
                "text": flux_prompt
            }
        },

        # Encode SDXL output for Flux
        "19": {
            "class_type": "VAEEncode",
            "inputs": {
                "pixels": ["10", 0],
                "vae": ["17", 0]
            }
        },

        # Flux sampling config
        "20": {
            "class_type": "ModelSamplingFlux",
            "inputs": {
                "model": ["15", 0],
                "max_shift": 1.15,
                "base_shift": 0.5,
                "width": 1024,
                "height": 1024
            }
        },

        # Flux KSampler (texture only - low denoise!)
        "21": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["20", 0],
                "positive": ["18", 0],
                "negative": None,
                "latent_image": ["19", 0],
                "seed": seed + 1000,
                "control_after_generate": "randomize",
                "steps": 15,
                "cfg": 1.0,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 0.20  # CRITICAL: Keep <= 0.25 to preserve identity
            }
        },

        # Flux VAE Decode
        "22": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["21", 0],
                "vae": ["17", 0]
            }
        },

        # Save final result
        "23": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["22", 0],
                "filename_prefix": f"{output_prefix}_final"
            }
        }
    }


def queue_workflow(workflow):
    """Queue a workflow via ComfyUI API"""
    data = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        result = json.loads(resp.read())
        return result.get("prompt_id")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        error_body = e.read().decode() if e.fp else "No body"
        print(f"Error details: {error_body[:1000]}")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None


def check_queue():
    """Check ComfyUI queue status"""
    try:
        req = urllib.request.Request(f"{COMFYUI_URL}/queue")
        resp = urllib.request.urlopen(req, timeout=10)
        q = json.loads(resp.read().decode())
        return len(q.get("queue_running", [])), len(q.get("queue_pending", []))
    except:
        return -1, -1


def wait_for_completion(check_interval=15):
    """Wait for queue to be empty"""
    while True:
        running, pending = check_queue()
        if running == 0 and pending == 0:
            return True
        if running == -1:
            print("  Warning: Could not check queue status")
        else:
            print(f"  [{time.strftime('%H:%M:%S')}] Queue: {running} running, {pending} pending...")
        time.sleep(check_interval)


def main():
    print("=" * 60)
    print("CHARACTER IDENTITY WORKFLOW TEST")
    print("FaceID Plus V2 + Flux Texture Enhancement")
    print("=" * 60)

    # Check ComfyUI status
    running, pending = check_queue()
    if running == -1:
        print("ERROR: ComfyUI not responding on port 8189")
        print("Make sure second ComfyUI instance is running on GPU 1")
        return

    print(f"ComfyUI online (GPU 1)! Queue: {running} running, {pending} pending")

    # Configuration - EDIT THESE
    ref_folder = "/home/will/ComfyUI/input/character_refs"
    ethnicity = "Latina woman with olive/tan skin, dark brown hair"
    output_name = "chel_faceid_test"

    print(f"\nReference folder: {ref_folder}")
    print(f"Ethnicity prompt: {ethnicity}")
    print(f"Output prefix: {output_name}")

    # Create and queue workflow
    print("\nCreating FaceID workflow...")
    workflow = create_faceid_workflow(
        ref_folder=ref_folder,
        ethnicity_prompt=ethnicity,
        output_prefix=output_name,
        seed=42424
    )

    pid = queue_workflow(workflow)
    if pid:
        print(f"Queued: {pid}")
        print("\nWaiting for completion...")
        print("(SDXL stage: ~1-2 min, Flux stage: ~30 sec)")
        wait_for_completion()
        print("\n" + "=" * 60)
        print("GENERATION COMPLETE!")
        print(f"SDXL output: {OUTPUT_DIR}/{output_name}_sdxl_*.png")
        print(f"Final output: {OUTPUT_DIR}/{output_name}_final_*.png")
        print("=" * 60)
    else:
        print("FAILED to queue workflow")


if __name__ == "__main__":
    main()
