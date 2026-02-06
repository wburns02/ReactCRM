#!/usr/bin/env python3
"""
Test I2V on Scenes 1 and 4
Uses correct WanVideoWrapper node inputs
"""

import json
import urllib.request
import time
import os

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/will/ComfyUI/output"

# Test scenes with motion prompts
TEST_SCENES = [
    {
        "scene": 1,
        "image": "alien_scene_01_00001_.png",
        "output": "alien_i2v_test_01",
        "prompt": "subtle camera drift forward, man breathing slowly, wind rustling corn stalks gently, truck headlights flickering slightly, cinematic slow motion, atmospheric",
        "seed": 50001
    },
    {
        "scene": 4,
        "image": "alien_scene_04_00001_.png",
        "output": "alien_i2v_test_04",
        "prompt": "intense close-up, eyes widening slowly, sweat forming on forehead, breathing heavily, subtle facial tremors of fear, cinematic dramatic lighting",
        "seed": 50004
    }
]


def create_i2v_workflow(image_name, prompt, output_prefix, seed):
    """Create API workflow with correct WanVideoWrapper node inputs"""
    return {
        "1": {
            "class_type": "LoadImage",
            "inputs": {
                "image": image_name
            }
        },
        "2": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {
                "model_name": "umt5-xxl-enc-bf16.safetensors",
                "precision": "bf16"
            }
        },
        "3": {
            "class_type": "WanVideoTextEncode",
            "inputs": {
                "t5": ["2", 0],
                "positive_prompt": prompt,
                "negative_prompt": "blurry, low quality, deformed, ugly, static, jerky motion, artifacts, watermark"
            }
        },
        "4": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": "wan2.2_i2v_low_noise_14B_fp8_scaled.safetensors",
                "base_precision": "bf16",
                "quantization": "fp8_e4m3fn_scaled",
                "load_device": "offload_device",
                "attention_mode": "sdpa"
            }
        },
        "5": {
            "class_type": "WanVideoVAELoader",
            "inputs": {
                "model_name": "Wan2_1_VAE_bf16.safetensors",
                "precision": "bf16"
            }
        },
        "6": {
            "class_type": "WanVideoImageToVideoEncode",
            "inputs": {
                "vae": ["5", 0],
                "start_image": ["1", 0],
                "width": 832,
                "height": 480,
                "num_frames": 49,
                "noise_aug_strength": 0.0,
                "start_latent_strength": 1.0,
                "end_latent_strength": 1.0,
                "force_offload": True
            }
        },
        "7": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["4", 0],
                "image_embeds": ["6", 0],
                "text_embeds": ["3", 0],
                "cfg": 6.0,
                "steps": 20,
                "seed": seed,
                "shift": 5.0,
                "force_offload": True,
                "scheduler": "dpm++_sde",
                "riflex_freq_index": 0
            }
        },
        "8": {
            "class_type": "WanVideoDecode",
            "inputs": {
                "vae": ["5", 0],
                "samples": ["7", 0],
                "enable_vae_tiling": False,
                "tile_x": 272,
                "tile_y": 272,
                "tile_stride_x": 144,
                "tile_stride_y": 144
            }
        },
        "9": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["8", 0],
                "frame_rate": 16,
                "loop_count": 0,
                "filename_prefix": output_prefix,
                "format": "video/h264-mp4",
                "pingpong": False,
                "save_output": True
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
        running = len(q.get("queue_running", []))
        pending = len(q.get("queue_pending", []))
        return running, pending
    except:
        return -1, -1


def wait_for_completion(check_interval=30):
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


def copy_image_to_input(src_name):
    """Copy image from output to input folder"""
    src = f"{OUTPUT_DIR}/{src_name}"
    dst = f"/home/will/ComfyUI/input/{src_name}"
    os.system(f"cp '{src}' '{dst}' 2>/dev/null")
    return src_name


def main():
    print("=" * 60)
    print("I2V TEST - Scenes 1 and 4")
    print("=" * 60)

    # Check ComfyUI status
    running, pending = check_queue()
    if running == -1:
        print("ERROR: ComfyUI not responding on port 8188")
        return

    print(f"ComfyUI online! Queue: {running} running, {pending} pending")

    # Copy images to input folder
    print("\nCopying images to input folder...")
    for scene_info in TEST_SCENES:
        copy_image_to_input(scene_info['image'])
        print(f"  Copied {scene_info['image']}")

    for scene_info in TEST_SCENES:
        print(f"\n{'='*50}")
        print(f"SCENE {scene_info['scene']}: {scene_info['image']}")
        print(f"{'='*50}")
        print(f"Motion: {scene_info['prompt'][:60]}...")
        print(f"Output: {scene_info['output']}")

        workflow = create_i2v_workflow(
            scene_info['image'],
            scene_info['prompt'],
            scene_info['output'],
            scene_info['seed']
        )

        pid = queue_workflow(workflow)
        if pid:
            print(f"Queued successfully! ID: {pid}")
            print("Waiting for completion (~8-12 minutes)...")
            wait_for_completion()
            print(f"Scene {scene_info['scene']} COMPLETE!")
        else:
            print(f"FAILED to queue scene {scene_info['scene']}")

    print("\n" + "=" * 60)
    print("I2V TEST COMPLETE!")
    print("Check /home/will/ComfyUI/output/ for results")
    print("=" * 60)


if __name__ == "__main__":
    main()
