#!/usr/bin/env python3
"""
Queue remaining UFO I2V clips (07-15)
Uses the working configuration from user's existing workflow
"""

import json
import urllib.request

COMFYUI_URL = "http://127.0.0.1:8188"

# Clips 07-15 with their reference images and motion prompts
REMAINING_CLIPS = [
    {"num": 7, "image": "ufo_clip07_terror_face_00001_.png", "prompt": "extreme close-up terror face, eyes wide with fear, sweat beading, harsh uplight from beam"},
    {"num": 8, "image": "ufo_clip08_feet_leaving_00001_.png", "prompt": "feet lifting off ground, body rising, clothes billowing upward, anti-gravity effect"},
    {"num": 9, "image": "ufo_clip09_midair_struggle_00001_.png", "prompt": "body twisting in midair, arms flailing, desperate struggle, beam particles swirling"},
    {"num": 10, "image": "ufo_clip10_slow_ascent_00001_.png", "prompt": "slow upward movement toward UFO, body silhouetted, particles streaming past"},
    {"num": 11, "image": "ufo_clip11_beam_core_00001_.png", "prompt": "intense energy swirling, face illuminated from below, screaming in bright light"},
    {"num": 12, "image": "ufo_clip12_approaching_hatch_00001_.png", "prompt": "approaching bright opening, hands reaching up, disorienting upward movement"},
    {"num": 13, "image": "ufo_clip13_final_pull_00001_.png", "prompt": "body pulled into blinding light, silhouette vanishing, energy rushing inward"},
    {"num": 14, "image": "ufo_clip14_hatch_closing_00001_.png", "prompt": "beam shutting off, hatch iris closing, dust settling, scene returning to darkness"},
    {"num": 15, "image": "ufo_clip15_departure_00001_.png", "prompt": "UFO ascending smoothly into sky, lights fading, becoming distant point, empty road"}
]

def build_i2v_workflow(image_filename, prompt, output_name, seed, width=832, height=560):
    """Build I2V workflow matching user's working configuration"""
    return {
        "11": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {
                "model_name": "umt5-xxl-enc-bf16.safetensors",
                "precision": "bf16",
                "load_device": "offload_device",
                "quantization": "disabled"
            }
        },
        "1": {
            "class_type": "LoadImage",
            "inputs": {"image": image_filename}
        },
        "38": {
            "class_type": "WanVideoVAELoader",
            "inputs": {
                "model_name": "Wan2_1_VAE_bf16.safetensors",
                "precision": "bf16"
            }
        },
        "22": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": "Wan2_2-I2V-A14B-LOW_fp8_e4m3fn_scaled_KJ.safetensors",
                "base_precision": "fp16",
                "quantization": "fp8_e4m3fn_scaled",
                "load_device": "offload_device",
                "attention_mode": "sdpa"
            }
        },
        "39": {
            "class_type": "WanVideoBlockSwap",
            "inputs": {
                "blocks_to_swap": 20,
                "offload_img_emb": True,
                "offload_txt_emb": True
            }
        },
        "56": {
            "class_type": "WanVideoSetBlockSwap",
            "inputs": {
                "model": ["22", 0],
                "block_swap_args": ["39", 0]
            }
        },
        "16": {
            "class_type": "WanVideoTextEncode",
            "inputs": {
                "positive_prompt": f"{prompt}, cinematic, smooth motion, high quality video, detailed",
                "negative_prompt": "blurry, jerky, low quality, artifacts",
                "t5": ["11", 0],
                "force_offload": True,
                "device": "gpu"
            }
        },
        "50": {
            "class_type": "WanVideoImageToVideoEncode",
            "inputs": {
                "vae": ["38", 0],
                "start_image": ["1", 0],
                "width": width,
                "height": height,
                "num_frames": 81,
                "noise_aug_strength": 0.45,
                "start_latent_strength": 1.0,
                "end_latent_strength": 0.0,
                "force_offload": True
            }
        },
        "27": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["56", 0],
                "image_embeds": ["50", 0],
                "text_embeds": ["16", 0],
                "cfg": 7.5,
                "steps": 35,
                "seed": seed,
                "shift": 1.0,
                "scheduler": "euler",
                "riflex_freq_index": 0,
                "force_offload": True
            }
        },
        "28": {
            "class_type": "WanVideoDecode",
            "inputs": {
                "vae": ["38", 0],
                "samples": ["27", 0],
                "enable_vae_tiling": False,
                "tile_x": 272,
                "tile_y": 272,
                "tile_stride_x": 144,
                "tile_stride_y": 128
            }
        },
        "30": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["28", 0],
                "frame_rate": 16.0,
                "loop_count": 0,
                "filename_prefix": output_name,
                "format": "video/h264-mp4",
                "pingpong": False,
                "save_output": True
            }
        }
    }

def submit_workflow(workflow, client_id=None):
    payload = {"prompt": workflow}
    if client_id:
        payload["client_id"] = client_id
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode()).get("prompt_id")

def main():
    print("=" * 60)
    print("QUEUEING REMAINING UFO I2V CLIPS (07-15)")
    print("=" * 60)
    print("Using working configuration:")
    print("  Model: Wan2_2-I2V-A14B-LOW_fp8_e4m3fn_scaled_KJ.safetensors")
    print("  VAE: Wan2_1_VAE_bf16.safetensors")
    print("=" * 60 + "\n")

    for clip in REMAINING_CLIPS:
        num = clip["num"]
        image = clip["image"]
        prompt = clip["prompt"]
        output_name = f"ufo_final_clip_{num:02d}"
        seed = 40 + num

        print(f"[Clip {num:02d}] Queueing...")
        print(f"  Image: {image}")
        print(f"  Prompt: {prompt[:50]}...")

        workflow = build_i2v_workflow(
            image_filename=image,
            prompt=prompt,
            output_name=output_name,
            seed=seed
        )

        try:
            prompt_id = submit_workflow(workflow, client_id=f"i2v-clip{num}")
            print(f"  Queued: {prompt_id[:8]}")
        except Exception as e:
            print(f"  ERROR: {e}")
        print()

    print("=" * 60)
    print("ALL CLIPS QUEUED!")
    print("Monitor progress at http://127.0.0.1:8188")
    print("=" * 60)

if __name__ == "__main__":
    main()
