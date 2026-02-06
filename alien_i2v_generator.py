#!/usr/bin/env python3
"""
Alien Abduction Film - Image to Video Generator
Uses Wan 2.2 I2V on single GPU (port 8188)
"""

import json
import urllib.request
import time
import glob
import os

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/will/ComfyUI/output"

# Motion prompts for each scene (subtle, cinematic movement)
MOTION_PROMPTS = [
    # Scene 1: Establishing - slight wind, breathing
    "subtle camera drift forward, man breathing, wind rustling corn stalks, truck headlights flickering slightly, cinematic slow motion",

    # Scene 2: Strange lights - lights pulsing
    "pulsing lights intensifying, man's expression shifting to concern, slight head movement looking up, cinematic",

    # Scene 3: UFO reveals - craft hovering
    "massive UFO hovering with slight oscillation, lights pulsing underneath, man stepping back in shock, corn swaying",

    # Scene 4: Terror - face reaction
    "intense close-up, eyes widening, sweat forming, breathing heavily, subtle facial tremors of fear, cinematic",

    # Scene 5: Beam activates - body lifting
    "tractor beam pulling upward, dust particles rising, body slowly lifting off ground, arms reaching out desperately",

    # Scene 6: Feet leaving ground - rising
    "feet rising off dirt road, legs dangling, desperate hand movements reaching down, looking down in terror",

    # Scene 7: Rising higher - floating
    "body floating upward in beam, spinning slowly, limbs flailing, truck getting smaller below, dramatic rise",

    # Scene 8: Approaching craft - ascending
    "rising toward dark UFO hull, reaching hands, light intensifying from opening above, dramatic upward motion",

    # Scene 9: Entering ship - being pulled in
    "being pulled through circular opening, body disappearing into bright light, last desperate look down",

    # Scene 10: Inside craft - disoriented
    "lying on floor, slowly lifting head, looking around in confusion, vapor swirling, lights pulsing on walls",

    # Scene 11: Examination room - struggling
    "strapped to table, struggling against restraints, alien silhouettes moving in background, instruments hovering",

    # Scene 12: Face to face - alien reach
    "alien hand slowly reaching toward face, eyes widening in terror, tears forming, subtle trembling",

    # Scene 13: The procedure - screaming
    "body arching in pain, screaming, bright light scanning, instruments moving, intense medical horror",

    # Scene 14: Falling back - tumbling
    "unconscious body tumbling through beam, falling toward Earth, UFO receding into stars above",

    # Scene 15: Aftermath - still
    "lying still in field, subtle breathing, sunrise light slowly brightening, peaceful but eerie stillness"
]


def queue_i2v(image_path, motion_prompt, output_name, seed=42):
    """Queue a Wan 2.2 I2V generation"""
    workflow = {
        "1": {
            "class_type": "LoadImage",
            "inputs": {"image": os.path.basename(image_path)}
        },
        "2": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {
                "t5_model": "umt5-xxl-enc-bf16.safetensors",
                "precision": "bf16",
                "model_manager": "offload_device",
                "quantization": "disabled"
            }
        },
        "3": {
            "class_type": "WanVideoTextEncode",
            "inputs": {
                "t5": ["2", 0],
                "prompt": motion_prompt,
                "negative_prompt": "blurry, jerky, low quality, artifacts, distorted, glitchy",
                "force_offload": True,
                "use_qencoder": False,
                "qencoder_device": "gpu"
            }
        },
        "4": {
            "class_type": "WanVideoVAELoader",
            "inputs": {
                "vae_name": "Wan2_1_VAE_bf16.safetensors",
                "precision": "bf16"
            }
        },
        "5": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": "Wan2_2-I2V-A14B-LOW_fp8_e4m3fn_scaled_KJ.safetensors",
                "precision": "fp16",
                "quantization": "fp8_e4m3fn_scaled",
                "model_manager": "offload_device",
                "attention_mode": "sdpa"
            }
        },
        "6": {
            "class_type": "WanVideoBlockSwap",
            "inputs": {
                "blocks_to_swap": 20,
                "offload_img_emb": True,
                "offload_txt_emb": True
            }
        },
        "7": {
            "class_type": "WanVideoSetBlockSwap",
            "inputs": {
                "model": ["5", 0],
                "block_swap_args": ["6", 0]
            }
        },
        "8": {
            "class_type": "WanVideoImageToVideoEncode",
            "inputs": {
                "vae": ["4", 0],
                "start_image": ["1", 0],
                "width": 832,
                "height": 560,
                "num_frames": 81,
                "noise_aug_strength": 0.45,
                "image_guidance_scale": 1.0,
                "strength": 0.0,
                "autosize_image": True
            }
        },
        "9": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["7", 0],
                "image_embeds": ["8", 0],
                "text_embeds": ["3", 0],
                "cfg": 7.5,
                "steps": 35,
                "seed": seed,
                "denoise_strength": 0.5,  # Low denoise to preserve details
                "sampler": "euler",
                "shift": 0,
                "force_offload": True
            }
        },
        "10": {
            "class_type": "WanVideoDecode",
            "inputs": {
                "vae": ["4", 0],
                "samples": ["9", 0],
                "enable_tiling": False,
                "tile_sample_min_height": 272,
                "tile_sample_min_width": 272,
                "tile_overlap_factor_height": 144,
                "tile_overlap_factor_width": 128
            }
        },
        "11": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["10", 0],
                "frame_rate": 16,
                "loop_count": 0,
                "filename_prefix": output_name,
                "format": "video/h264-mp4",
                "pingpong": False,
                "save_output": True,
                "audio": "",
                "meta_batch": ""
            }
        }
    }

    data = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read()).get("prompt_id")


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


def wait_for_completion(check_interval=60):
    """Wait for queue to be empty (I2V takes longer)"""
    while True:
        running, pending = check_queue()
        if running == 0 and pending == 0:
            return True
        if running == -1:
            print("  Warning: Could not check queue status")
        else:
            print(f"  [{time.strftime('%H:%M:%S')}] Queue: {running} running, {pending} pending...")
        time.sleep(check_interval)


def find_scene_images():
    """Find all generated scene images"""
    images = {}
    for i in range(1, 16):
        pattern = f"{OUTPUT_DIR}/alien_scene_{i:02d}_*.png"
        matches = sorted(glob.glob(pattern))
        if matches:
            images[i] = matches[-1]  # Use most recent
    return images


def generate_all_i2v():
    """Generate I2V clips for all scenes"""
    print("=" * 60)
    print("GENERATING I2V VIDEO CLIPS")
    print("=" * 60)

    # Find scene images
    scene_images = find_scene_images()
    print(f"Found {len(scene_images)} scene images")

    if len(scene_images) < 15:
        missing = [i for i in range(1, 16) if i not in scene_images]
        print(f"WARNING: Missing scenes: {missing}")
        print("Run alien_film_generator.py first to generate images")
        return False

    # Generate I2V for each scene
    for scene_num in range(1, 16):
        print(f"\n{'='*40}")
        print(f"Scene {scene_num}/15 - I2V Generation")
        print(f"{'='*40}")

        image_path = scene_images[scene_num]
        motion = MOTION_PROMPTS[scene_num - 1]
        output_name = f"alien_clip_{scene_num:02d}"
        seed = 50000 + (scene_num * 777)

        print(f"Image: {os.path.basename(image_path)}")
        print(f"Motion: {motion[:60]}...")

        pid = queue_i2v(image_path, motion, output_name, seed)
        print(f"Queued: {pid}")
        print("Waiting for completion (this takes ~8-12 minutes per clip)...")

        wait_for_completion(check_interval=60)
        print(f"Scene {scene_num} I2V COMPLETE!")

    print("\n" + "=" * 60)
    print("ALL 15 I2V CLIPS GENERATED!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("ALIEN ABDUCTION FILM - I2V GENERATOR")
    print("Single GPU Mode (GPU 0 only)")
    print("=" * 60)

    # Check if ComfyUI is online
    running, pending = check_queue()
    if running == -1:
        print("ERROR: ComfyUI not responding on port 8188")
        exit(1)

    print(f"ComfyUI online! Queue: {running} running, {pending} pending")

    generate_all_i2v()

    print("\nI2V generation complete!")
    print("Next: Run frame interpolation and upscaling")
