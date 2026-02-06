#!/usr/bin/env python3
"""
UFO Abduction - I2V Animation
Animate existing reference images for visual consistency
Uses wan2.2-i2v-rapid-aio model with k_img weights
"""

import json
import time
import urllib.request
import base64
import os

COMFYUI_URL = "http://127.0.0.1:8188"

# Motion prompts for each clip - describes the MOTION not the scene
CLIPS = [
    {"name": "clip01_establishing", "motion": "slow walking motion, gentle camera drift backward, subtle fog movement, peaceful night atmosphere"},
    {"name": "clip02_tracking", "motion": "side tracking motion following figure, wind moving hair and jacket, nervous head turns looking around"},
    {"name": "clip03_head_turn", "motion": "sudden stop, slow head turn upward toward sky, eyes widening, growing tension"},
    {"name": "clip04_ufo_reveal", "motion": "massive UFO silently descending from clouds, lights pulsing rhythmically, clouds parting"},
    {"name": "clip05_ufo_hover", "motion": "UFO hovering with rotating outer ring, pulsing lights casting moving shadows, figure frozen looking up"},
    {"name": "clip06_beam_activate", "motion": "sudden bright beam shooting down, particles swirling, wind picking up violently, clothes and hair whipping"},
    {"name": "clip07_terror_face", "motion": "face contorting in terror, eyes widening, mouth opening in scream, sweat and tears streaming"},
    {"name": "clip08_feet_leaving", "motion": "body lifting off ground, feet dangling, jacket billowing upward, struggling against invisible force"},
    {"name": "clip09_midair_struggle", "motion": "body twisting in mid-air, arms flailing, desperate struggle against levitation"},
    {"name": "clip10_slow_ascent", "motion": "slow upward movement toward UFO, particles streaming past, body silhouetted against bright light"},
    {"name": "clip11_beam_core", "motion": "intense energy swirling, face illuminated from below, screaming in bright light"},
    {"name": "clip12_approaching_hatch", "motion": "approaching bright opening, hands reaching up desperately, disorienting movement"},
    {"name": "clip13_final_pull", "motion": "body pulled into blinding light, silhouette vanishing, energy rushing inward"},
    {"name": "clip14_hatch_closing", "motion": "beam shutting off, hatch closing, dust settling, scene returning to darkness"},
    {"name": "clip15_departure", "motion": "UFO ascending smoothly into sky, lights fading, becoming distant point, empty road below"}
]

NEGATIVE = "blurry, low quality, jerky motion, flickering, stuttering, artifacts, distortion, unrealistic movement"

def upload_image(filepath):
    """Upload image to ComfyUI and return filename"""
    with open(filepath, 'rb') as f:
        image_data = f.read()

    # Create multipart form data
    boundary = '----WebKitFormBoundary' + str(int(time.time()))
    filename = os.path.basename(filepath)

    body = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
        f'Content-Type: image/png\r\n\r\n'
    ).encode() + image_data + f'\r\n--{boundary}--\r\n'.encode()

    req = urllib.request.Request(
        f"{COMFYUI_URL}/upload/image",
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
    )
    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read().decode())
    return result.get('name', filename)

def build_i2v_workflow(image_filename, motion_prompt, output_name, seed=None):
    """Build I2V workflow using rapid model - 81 frames for 5 seconds"""
    if seed is None:
        seed = int(time.time() * 1000) % 2**31

    return {
        # Load T5 text encoder
        "1": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {
                "model_name": "umt5-xxl-enc-bf16.safetensors",
                "precision": "bf16",
                "load_device": "offload_device",
                "quantization": "disabled"
            }
        },
        # Encode motion prompt
        "2": {
            "class_type": "WanVideoTextEncode",
            "inputs": {
                "t5": ["1", 0],
                "positive_prompt": motion_prompt + ", smooth cinematic motion, photorealistic, high quality video",
                "negative_prompt": NEGATIVE,
                "force_offload": True,
                "enable_enhanced_prompt": False,
                "enhanced_prompt_device": "gpu"
            }
        },
        # Load input image
        "3": {
            "class_type": "LoadImage",
            "inputs": {
                "image": image_filename
            }
        },
        # Resize image to 832x480 (WanVideo compatible)
        "4": {
            "class_type": "ImageResize+",
            "inputs": {
                "image": ["3", 0],
                "width": 832,
                "height": 480,
                "interpolation": "lanczos",
                "method": "fill / crop",
                "condition": "always",
                "multiple_of": 16
            }
        },
        # Load I2V model (rapid all-in-one)
        "5": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": "wan2.2-i2v-rapid-aio.safetensors",
                "base_precision": "bf16",
                "quantization": "disabled",
                "load_device": "offload_device",
                "attention": "sdpa"
            }
        },
        # Encode image for I2V
        "6": {
            "class_type": "WanVideoImageEncode",
            "inputs": {
                "model": ["5", 0],
                "image": ["4", 0],
                "width": 832,
                "height": 480,
                "num_frames": 81,
                "start_latent_strength": 1.0,
                "end_latent_strength": 1.0
            }
        },
        # Load VAE
        "7": {
            "class_type": "WanVideoVAELoader",
            "inputs": {
                "model_name": "Wan2_2_VAE_bf16.safetensors",
                "precision": "bf16"
            }
        },
        # Sample video
        "8": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["5", 0],
                "image_embeds": ["6", 0],
                "text_embeds": ["2", 0],
                "cfg": 5.0,
                "shift": 5.0,
                "steps": 20,
                "seed": seed,
                "force_offload": True,
                "scheduler": "unipc",
                "riflex_freq_index": 0
            }
        },
        # Decode video
        "9": {
            "class_type": "WanVideoDecode",
            "inputs": {
                "vae": ["7", 0],
                "samples": ["8", 0],
                "enable_vae_tiling": True,
                "tile_x": 272,
                "tile_y": 272,
                "tile_stride_x": 144,
                "tile_stride_y": 128
            }
        },
        # Save video
        "10": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["9", 0],
                "frame_rate": 16,
                "loop_count": 0,
                "filename_prefix": output_name,
                "format": "video/h264-mp4",
                "pix_fmt": "yuv420p",
                "crf": 17,
                "save_metadata": True,
                "trim_to_audio": False,
                "pingpong": False,
                "save_output": True
            }
        }
    }

def submit_workflow(workflow):
    data = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode()).get("prompt_id")

def wait_for_completion(prompt_id, timeout=1200):
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
                    if msgs:
                        for m in msgs:
                            if isinstance(m, list) and len(m) > 1 and 'exception_message' in str(m[1]):
                                print(f"\n  ERROR: {m[1].get('exception_message', '')[:200]}")
                    return None
        except: pass
        print(".", end="", flush=True)
        time.sleep(3)
    print("\n  TIMEOUT!")
    return None

def generate_videos():
    print("=" * 60)
    print("UFO ABDUCTION - I2V ANIMATION")
    print("=" * 60)
    print("Animating reference images for visual consistency")
    print("Resolution: 832x480, 81 frames (5 seconds), rapid I2V model")
    print("=" * 60 + "\n")

    # Get list of available images
    image_dir = "/home/will/ComfyUI/output"

    for i, clip in enumerate(CLIPS, 1):
        image_path = f"{image_dir}/ufo_{clip['name']}_00001_.png"
        print(f"[{i}/15] {clip['name']}")
        print(f"  Motion: {clip['motion'][:60]}...")

        # Upload image (or use already uploaded name)
        image_filename = f"ufo_{clip['name']}_00001_.png"

        workflow = build_i2v_workflow(
            image_filename=image_filename,
            motion_prompt=clip['motion'],
            output_name=f"ufo_i2v_{clip['name']}",
            seed=42 + i
        )

        try:
            prompt_id = submit_workflow(workflow)
            print(f"  Generating", end="")
            result = wait_for_completion(prompt_id, timeout=600)
            if result:
                outputs = result.get("outputs", {})
                for node_out in outputs.values():
                    if "gifs" in node_out:
                        for vid in node_out["gifs"]:
                            print(f" -> {vid.get('filename')}")
                        break
                else:
                    print(" DONE")
            else:
                print(" FAILED")
        except Exception as e:
            print(f" ERROR: {e}")
        print()

    print("=" * 60)
    print("GENERATION COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    generate_videos()
