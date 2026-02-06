#!/usr/bin/env python3
"""
Fix Alien Abduction Scenes with FaceID
Regenerates scenes 1 and 3 with proper character identity lock
"""

import json
import urllib.request
import time

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/will/ComfyUI/output"

# Scenes that need fixing
SCENES_TO_FIX = [
    # Scene 1: Establishing shot - man standing by truck in cornfield
    {
        "scene": 1,
        "prompt": "Photorealistic cinematic still frame, 35mm film look, a man standing beside an old pickup truck on a dirt road at night, tall corn stalks surrounding him, looking up at the sky with curiosity, dark atmospheric lighting with subtle moonlight, slight lens flare from truck headlights, professional cinematography, film grain, moody dark blue color grading, ultra detailed, 8K",
        "output": "alien_scene_01_fixed",
        "seed": 11111
    },
    # Scene 3: UFO reveals itself - MUST be photorealistic night scene
    {
        "scene": 3,
        "prompt": "Photorealistic cinematic still frame, 35mm film look, a massive dark metallic UFO hovering above a cornfield at night, intense bright lights emanating from underneath the craft, the same man from previous scenes looking up in shock and awe, atmospheric perspective, volumetric fog and light beams, professional cinematography, film grain, dark atmospheric lighting, dramatic scale showing craft dwarfing the human figure, 8K ultra detailed, moody dark blue color grading",
        "output": "alien_scene_03_fixed",
        "seed": 33333
    }
]


def create_faceid_scene_workflow(scene_prompt, output_prefix, seed):
    """Create workflow with FaceID for character-consistent scene generation"""

    # Combine scene prompt with character description
    full_prompt = f"{scene_prompt}, the man has olive/tan skin, dark brown shaggy hair, mustache, wearing brown jacket"

    negative_prompt = "white skin, pale skin, blonde hair, red hair, anime, cartoon, illustration, 3D render, CGI, video game, digital art, painting, fantasy style, bright colors, daytime, unrealistic, deformed, ugly, blurry, watermark"

    return {
        # Load character references (6 best images)
        "1": {
            "class_type": "LoadImagesFromFolderKJ",
            "inputs": {
                "folder": "/home/will/ComfyUI/input/character_refs",
                "width": 1024,
                "height": 1024,
                "keep_aspect_ratio": "crop",
                "start_index": 0,
                "image_load_cap": 6,
                "include_subfolders": False
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
                "lora_strength": 0.7,
                "provider": "CUDA"
            }
        },

        # Positive prompt
        "5": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "clip": ["2", 1],
                "text": full_prompt
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
                "weight": 1.0,  # Moderate weight for scenes (not portraits)
                "weight_faceidv2": 0.9,
                "weight_type": "linear",
                "combine_embeds": "norm average",
                "start_at": 0.0,
                "end_at": 1.0,
                "embeds_scaling": "K+V"
            }
        },

        # Empty latent (832x480 for I2V compatible dimensions)
        "8": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": 832,
                "height": 480,
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
                "steps": 30,
                "cfg": 7.0,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 1.0
            }
        },

        # VAE Decode
        "10": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["9", 0],
                "vae": ["2", 2]
            }
        },

        # Save image
        "11": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["10", 0],
                "filename_prefix": output_prefix
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
        print(f"Error details: {error_body[:500]}")
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


def wait_for_completion(check_interval=10):
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
    print("FIXING ALIEN SCENES WITH FACEID")
    print("Character-consistent scene regeneration")
    print("=" * 60)

    # Check ComfyUI status
    running, pending = check_queue()
    if running == -1:
        print("ERROR: ComfyUI not responding on port 8188")
        return

    print(f"ComfyUI online! Queue: {running} running, {pending} pending")

    for scene_info in SCENES_TO_FIX:
        print(f"\n{'='*50}")
        print(f"FIXING SCENE {scene_info['scene']}")
        print(f"{'='*50}")
        print(f"Output: {scene_info['output']}")

        workflow = create_faceid_scene_workflow(
            scene_info['prompt'],
            scene_info['output'],
            scene_info['seed']
        )

        pid = queue_workflow(workflow)
        if pid:
            print(f"Queued: {pid}")
            print("Waiting for completion (~1-2 min)...")
            wait_for_completion()
            print(f"Scene {scene_info['scene']} FIXED!")
        else:
            print(f"FAILED to queue scene {scene_info['scene']}")

    print("\n" + "=" * 60)
    print("SCENE FIXES COMPLETE!")
    print("Fixed images saved with '_fixed' suffix")
    print("Review the images before running I2V")
    print("=" * 60)


if __name__ == "__main__":
    main()
