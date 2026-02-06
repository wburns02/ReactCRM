#!/usr/bin/env python3
"""
Simple Image-to-Video Generator using ComfyUI + WanVideo 2.2
Usage: python i2v.py <image_path> [prompt] [output_name]

Examples:
  python i2v.py /path/to/image.jpg
  python i2v.py /path/to/image.jpg "the subject smiles and waves"
  python i2v.py /path/to/image.jpg "camera pans right" my_video
"""

import sys
import json
import time
import urllib.request
import os

COMFYUI_URL = "http://127.0.0.1:8188"

def build_workflow(image_name, prompt, negative_prompt, output_prefix):
    return {
        "1": {
            "class_type": "LoadImage",
            "inputs": {"image": image_name, "upload": "image"}
        },
        "2": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {
                "model": "umt5-xxl-enc-bf16.safetensors",
                "precision": "bf16",
                "load_device": "offload_device",
                "quantization": "disabled"
            }
        },
        "3": {
            "class_type": "WanVideoTextEncode",
            "inputs": {
                "t5": ["2", 0],
                "positive_prompt": prompt,
                "negative_prompt": negative_prompt,
                "force_offload": True,
                "enable_enhanced_prompt": False,
                "enhanced_prompt_device": "gpu"
            }
        },
        "4": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": "wan/I2V/Wan2_2-I2V-A14B-HIGH_fp8_e4m3fn_scaled_KJ.safetensors",
                "base_precision": "fp16",
                "quantization": "fp8_e4m3fn_scaled",
                "load_device": "offload_device",
                "attention": "sdpa"
            }
        },
        "5": {
            "class_type": "WanVideoVAELoader",
            "inputs": {
                "model": "Wan2_2_VAE_bf16.safetensors",
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
                "noise_aug_strength": 0,
                "strength_1": 1,
                "strength_2": 1,
                "enable_vae_tiling": True,
                "is_pusa": False,
                "loop_latent": False
            }
        },
        "7": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["4", 0],
                "image_embeds": ["6", 0],
                "text_embeds": ["3", 0],
                "cfg": 6,
                "shift": 1,
                "steps": 20,
                "seed": int(time.time()) % 2**31,
                "force_offload": True,
                "scheduler": "dpm++_sde",
                "riflex_freq_index": 0,
                "denoise_strength": 1,
                "batched_cfg": False,
                "rope_function": "comfy",
                "start_step": 0,
                "end_step": -1,
                "add_noise_to_samples": False
            }
        },
        "8": {
            "class_type": "WanVideoDecode",
            "inputs": {
                "vae": ["5", 0],
                "samples": ["7", 0],
                "enable_vae_tiling": False,
                "tile_sample_min_height": 272,
                "tile_sample_min_width": 272,
                "tile_overlap_factor_height": 144,
                "tile_overlap_factor_width": 128,
                "auto_tile_size": "default"
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
                "pix_fmt": "yuv420p",
                "crf": 19,
                "save_metadata": True,
                "trim_to_audio": False,
                "pingpong": False,
                "save_output": True
            }
        }
    }

def upload_image(image_path):
    """Upload image to ComfyUI"""
    filename = os.path.basename(image_path)

    with open(image_path, "rb") as f:
        file_data = f.read()

    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = []
    body.append(f"--{boundary}".encode())
    body.append(f'Content-Disposition: form-data; name="image"; filename="{filename}"'.encode())
    body.append(b"Content-Type: image/jpeg")
    body.append(b"")
    body.append(file_data)
    body.append(f"--{boundary}".encode())
    body.append(b'Content-Disposition: form-data; name="overwrite"')
    body.append(b"")
    body.append(b"true")
    body.append(f"--{boundary}--".encode())

    body_bytes = b"\r\n".join(body)

    req = urllib.request.Request(
        f"{COMFYUI_URL}/upload/image",
        data=body_bytes,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )

    resp = urllib.request.urlopen(req, timeout=60)
    result = json.loads(resp.read().decode())
    return result.get("name", filename)

def submit_workflow(workflow):
    """Submit workflow and return prompt ID"""
    data = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read().decode())
    return result.get("prompt_id")

def wait_for_completion(prompt_id, timeout=600):
    """Wait for workflow to complete"""
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.Request(f"{COMFYUI_URL}/history/{prompt_id}")
            resp = urllib.request.urlopen(req, timeout=10)
            history = json.loads(resp.read().decode())

            if prompt_id in history:
                return history[prompt_id]
        except:
            pass

        try:
            req = urllib.request.Request(f"{COMFYUI_URL}/prompt")
            resp = urllib.request.urlopen(req, timeout=5)
            queue = json.loads(resp.read().decode())
            running = queue.get("exec_info", {}).get("queue_remaining", 0)
            print(f"\rProcessing... (queue: {running})", end="", flush=True)
        except:
            pass

        time.sleep(2)

    raise TimeoutError("Workflow timed out")

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    image_path = sys.argv[1]
    prompt = sys.argv[2] if len(sys.argv) > 2 else "cinematic video, the subject slowly moves, professional lighting, smooth motion, high quality"
    output_name = sys.argv[3] if len(sys.argv) > 3 else "i2v_output"
    negative = "blurry, low quality, deformed, ugly, static, jerky motion, artifacts, watermark"

    if not os.path.exists(image_path):
        print(f"Error: Image not found: {image_path}")
        sys.exit(1)

    print(f"Image: {image_path}")
    print(f"Prompt: {prompt}")
    print(f"Output: {output_name}")
    print()

    print("Uploading image...")
    image_name = upload_image(image_path)
    print(f"Uploaded as: {image_name}")

    print("Submitting workflow...")
    workflow = build_workflow(image_name, prompt, negative, output_name)
    prompt_id = submit_workflow(workflow)
    print(f"Prompt ID: {prompt_id}")

    print("Processing (this takes a few minutes)...")
    result = wait_for_completion(prompt_id)
    print("\nComplete!")

    outputs = result.get("outputs", {})
    for node_id, node_output in outputs.items():
        if "gifs" in node_output:
            for gif in node_output["gifs"]:
                filename = gif.get("filename")
                subfolder = gif.get("subfolder", "")
                output_path = f"/home/will/ComfyUI/output/{subfolder}/{filename}" if subfolder else f"/home/will/ComfyUI/output/{filename}"
                print(f"Output: {output_path}")

if __name__ == "__main__":
    main()
