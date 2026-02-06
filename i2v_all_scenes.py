#!/usr/bin/env python3
"""
Generate I2V clips for all 15 alien abduction scenes
Skips scenes 1 and 4 (already completed as tests)
"""

import json
import urllib.request
import time
import os

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/will/ComfyUI/output"

# All 15 scenes with motion prompts
ALL_SCENES = [
    # Scene 1: Establishing - slight wind, breathing (ALREADY DONE)
    {"scene": 1, "image": "alien_scene_01_00001_.png", "output": "alien_clip_01",
     "prompt": "subtle camera drift forward, man breathing slowly, wind rustling corn stalks gently, truck headlights flickering slightly, cinematic slow motion, atmospheric",
     "seed": 50001, "skip": True},

    # Scene 2: Strange lights - lights pulsing
    {"scene": 2, "image": "alien_scene_02_00001_.png", "output": "alien_clip_02",
     "prompt": "pulsing lights intensifying overhead, man's expression shifting to concern, slight head movement looking up, eerie glow on face, cinematic",
     "seed": 50002, "skip": False},

    # Scene 3: UFO reveals - craft hovering
    {"scene": 3, "image": "alien_scene_03_00001_.png", "output": "alien_clip_03",
     "prompt": "massive UFO hovering with slight oscillation, lights pulsing underneath, man stepping back in shock, corn swaying, dramatic lighting",
     "seed": 50003, "skip": False},

    # Scene 4: Terror - face reaction (ALREADY DONE)
    {"scene": 4, "image": "alien_scene_04_00001_.png", "output": "alien_clip_04",
     "prompt": "intense close-up, eyes widening slowly, sweat forming on forehead, breathing heavily, subtle facial tremors of fear, cinematic dramatic lighting",
     "seed": 50004, "skip": True},

    # Scene 5: Beam activates - body lifting
    {"scene": 5, "image": "alien_scene_05_00001_.png", "output": "alien_clip_05",
     "prompt": "tractor beam pulling upward, dust particles rising, body slowly lifting off ground, arms reaching out desperately, glowing beam",
     "seed": 50005, "skip": False},

    # Scene 6: Feet leaving ground - rising
    {"scene": 6, "image": "alien_scene_06_00001_.png", "output": "alien_clip_06",
     "prompt": "feet rising off dirt road, legs dangling, desperate hand movements reaching down, looking down in terror, floating motion",
     "seed": 50006, "skip": False},

    # Scene 7: Rising higher - floating
    {"scene": 7, "image": "alien_scene_07_00001_.png", "output": "alien_clip_07",
     "prompt": "body floating upward in beam, spinning slowly, limbs flailing gently, truck getting smaller below, dramatic rise through light",
     "seed": 50007, "skip": False},

    # Scene 8: Approaching craft - ascending
    {"scene": 8, "image": "alien_scene_08_00001_.png", "output": "alien_clip_08",
     "prompt": "rising toward dark UFO hull, reaching hands upward, light intensifying from opening above, dramatic upward motion, overwhelming scale",
     "seed": 50008, "skip": False},

    # Scene 9: Entering ship - being pulled in
    {"scene": 9, "image": "alien_scene_09_00001_.png", "output": "alien_clip_09",
     "prompt": "being pulled through circular opening, body disappearing into bright light, last desperate look down, engulfing illumination",
     "seed": 50009, "skip": False},

    # Scene 10: Inside craft - disoriented
    {"scene": 10, "image": "alien_scene_10_00001_.png", "output": "alien_clip_10",
     "prompt": "lying on floor, slowly lifting head, looking around in confusion, vapor swirling gently, lights pulsing on metallic walls",
     "seed": 50010, "skip": False},

    # Scene 11: Examination room - struggling
    {"scene": 11, "image": "alien_scene_11_00001_.png", "output": "alien_clip_11",
     "prompt": "strapped to examination table, struggling against restraints, alien silhouettes moving slowly in background, instruments hovering",
     "seed": 50011, "skip": False},

    # Scene 12: Face to face - alien reach
    {"scene": 12, "image": "alien_scene_12_00001_.png", "output": "alien_clip_12",
     "prompt": "alien hand slowly reaching toward face, eyes widening in terror, tears forming, subtle trembling, cold alien touch approaching",
     "seed": 50012, "skip": False},

    # Scene 13: The procedure - screaming
    {"scene": 13, "image": "alien_scene_13_00001_.png", "output": "alien_clip_13",
     "prompt": "body arching in pain, screaming silently, bright light scanning across body, instruments moving precisely, intense horror",
     "seed": 50013, "skip": False},

    # Scene 14: Falling back - tumbling
    {"scene": 14, "image": "alien_scene_14_00001_.png", "output": "alien_clip_14",
     "prompt": "unconscious body tumbling slowly through beam, falling gently toward Earth, UFO receding into stars above, peaceful descent",
     "seed": 50014, "skip": False},

    # Scene 15: Aftermath - still
    {"scene": 15, "image": "alien_scene_15_00001_.png", "output": "alien_clip_15",
     "prompt": "lying still in field, subtle breathing movement, sunrise light slowly brightening, peaceful but eerie stillness, morning mist",
     "seed": 50015, "skip": False}
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


def wait_for_completion(check_interval=60):
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
    print("ALIEN ABDUCTION I2V - ALL 15 SCENES")
    print("=" * 60)

    # Check ComfyUI status
    running, pending = check_queue()
    if running == -1:
        print("ERROR: ComfyUI not responding on port 8188")
        return

    print(f"ComfyUI online! Queue: {running} running, {pending} pending")

    # Copy all images to input folder
    print("\nCopying images to input folder...")
    for scene_info in ALL_SCENES:
        if not scene_info.get("skip", False):
            copy_image_to_input(scene_info['image'])
            print(f"  Copied {scene_info['image']}")

    # Count scenes to process
    scenes_to_process = [s for s in ALL_SCENES if not s.get("skip", False)]
    print(f"\nProcessing {len(scenes_to_process)} scenes (skipping pre-completed)")

    completed = 0
    for scene_info in ALL_SCENES:
        if scene_info.get("skip", False):
            print(f"\n[SKIP] Scene {scene_info['scene']} - already completed")
            continue

        completed += 1
        print(f"\n{'='*50}")
        print(f"SCENE {scene_info['scene']}/15 ({completed}/{len(scenes_to_process)} remaining)")
        print(f"{'='*50}")
        print(f"Image: {scene_info['image']}")
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
            print(f"Queued: {pid}")
            print("Waiting (~9 minutes)...")
            wait_for_completion()
            print(f"Scene {scene_info['scene']} COMPLETE!")
        else:
            print(f"FAILED to queue scene {scene_info['scene']}")

    print("\n" + "=" * 60)
    print("ALL 15 I2V CLIPS COMPLETE!")
    print("Output: /home/will/ComfyUI/output/alien_clip_*.mp4")
    print("=" * 60)


if __name__ == "__main__":
    main()
