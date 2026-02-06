#!/usr/bin/env python3
"""
UFO Abduction Video Generator
Generates 15 stills and animates them into a 60-second video
"""

import json
import time
import urllib.request
import os

COMFYUI_URL = "http://127.0.0.1:8189"

# Global negative prompt
NEGATIVE = "blurry, deformed, ugly, low resolution, artifacts, cartoon, anime, overexposed, underexposed, watermark, text, bad anatomy, mutated hands, extra limbs, jerky motion, flickering, low quality, grainy, compressed, unrealistic faces, plastic skin, exaggerated cartoonish expressions, poor lighting, flat colors, static pose, clothing glitches"

# All 15 clip prompts
CLIPS = [
    {
        "name": "clip01_establishing",
        "prompt": "Cinematic ultra-realistic establishing shot, photorealistic 4K movie footage like Denis Villeneuve: vast dark rural Texas country road at midnight under a clear starry sky with faint Milky Way, subtle moonlight casting long shadows, a lone mid-30s athletic Caucasian man in dark leather jacket, black shirt, jeans and boots walking slowly down the center of the empty asphalt road away from camera, wide-angle tracking shot from behind, gentle camera drift, rolling hills and distant trees silhouetted, cool blue moonlight with warm distant farmhouse light on horizon, atmospheric fog near ground, high dynamic range, sharp stars, masterpiece, best quality, 8K raw"
    },
    {
        "name": "clip02_tracking",
        "prompt": "Ultra-realistic cinematic tracking shot following the man walking down dark country road at night, medium-wide shot from side angle, subtle moonlight illuminating his face showing calm but alert expression, leather jacket catching faint light, slow steady walk, wind gently moving his hair, distant cricket sounds implied, cool blue tones with deep shadows, volumetric fog swirling around boots, high contrast, photorealistic textures on asphalt and clothing, sharp focus, masterpiece, 8K"
    },
    {
        "name": "clip03_head_turn",
        "prompt": "Close-up side profile of the man walking, he suddenly stops and slowly turns his head upward toward the sky with growing curiosity, subtle moonlight on face, eyes widening slightly, faint green glow beginning to reflect in his eyes, leather jacket collar up, realistic skin texture and stubble, slow-motion head turn, cinematic depth of field with blurred background road, atmospheric night lighting, photorealistic, masterpiece, 8K raw"
    },
    {
        "name": "clip04_ufo_reveal",
        "prompt": "Dramatic low-angle shot looking up past the man as a massive sleek metallic disc-shaped UFO silently emerges from behind clouds, pulsating soft blue-white lights around rim, subtle green glow underneath, stars obscured by its silhouette, man in foreground looking up in awe, wide lens cinematic composition, volumetric god rays breaking through clouds, ultra-realistic metallic reflections, high dynamic range, photorealistic, masterpiece, 8K"
    },
    {
        "name": "clip05_ufo_hover",
        "prompt": "Intense overhead shot of the massive UFO now fully visible hovering directly above the road, intricate metallic surface with glowing panels, rotating outer ring with rhythmic blue-white pulses, faint humming light effect, man below looking straight up, his face illuminated by eerie green light from below, dramatic upward camera tilt, realistic scale and detail, night sky background, photorealistic, masterpiece, 8K raw"
    },
    {
        "name": "clip06_beam_activate",
        "prompt": "Sudden bright white tractor beam with glowing particles and energy sparks shoots down from center of UFO, illuminating the entire scene in harsh white light mixed with green edges, man bathed in beam looking up in shock, wind picking up, jacket flapping, debris and dust swirling upward, extreme contrast lighting, volumetric beam cutting through night fog, photorealistic energy effects, masterpiece, 8K"
    },
    {
        "name": "clip07_terror_face",
        "prompt": "Extreme close-up on the man's terrified face inside the tractor beam, wide-eyed pure horror, mouth open in silent scream, sweat beads forming on forehead catching light, veins in neck straining, eyes reflecting green UFO lights, ultra-detailed skin pores and realistic fear expression, shallow depth of field, slow-motion, cinematic horror lighting, photorealistic, masterpiece, 8K raw"
    },
    {
        "name": "clip08_feet_leaving",
        "prompt": "Medium shot from side as the man begins to lift off the ground feet first, boots dangling, legs kicking slightly in panic, jacket and shirt rippling upward from anti-gravity force, glowing particles swirling around body, tractor beam intensely bright with energy distortion, night road below receding, realistic physics and fabric movement, photorealistic, masterpiece, 8K"
    },
    {
        "name": "clip09_midair_struggle",
        "prompt": "Dynamic shot of the man fully airborne 10 feet up, twisting and clawing at the air in desperation, arms reaching downward, face contorted in terror, hair and jacket whipping wildly, bright tractor beam with visible heat distortion and floating dust, UFO looming above, dramatic low-angle looking up, high dynamic range, photorealistic motion, masterpiece, 8K"
    },
    {
        "name": "clip10_slow_ascent",
        "prompt": "Slow-motion upward tracking shot as the man ascends toward the underside of the UFO, beam particles flowing past him, his body silhouetted against bright light, arms outstretched, face still showing raw fear, intricate UFO underside details visible with glowing panels opening slightly, volumetric light rays, ultra-realistic, cinematic, masterpiece, 8K raw"
    },
    {
        "name": "clip11_beam_core",
        "prompt": "Intense close-up inside the tractor beam core, man surrounded by swirling energy particles and sparks, face illuminated harshly from below, eyes squinting against brightness, mouth open screaming, skin glistening with sweat, ultra-detailed textures, surreal yet photorealistic energy field, slow-motion ascent, masterpiece, 8K"
    },
    {
        "name": "clip12_approaching_hatch",
        "prompt": "Point-of-view style shot from man's perspective looking up as he nears the open glowing hatch on UFO underside, bright white-green light pouring out, intricate alien metallic architecture, energy field rippling, his hands visible reaching out in final panic, disorienting camera movement, ultra-realistic sci-fi detail, masterpiece, 8K raw"
    },
    {
        "name": "clip13_final_pull",
        "prompt": "Dramatic silhouette shot as the man is pulled fully into the bright open hatch of the UFO, body disappearing into blinding white light, outline visible for a moment before vanishing, energy particles rushing inward, camera shaking slightly, intense lens flare, photorealistic, cinematic climax, masterpiece, 8K"
    },
    {
        "name": "clip14_hatch_closing",
        "prompt": "Exterior shot of UFO underside as the glowing hatch iris closes smoothly after abduction, tractor beam shuts off abruptly plunging scene back into moonlight, remaining dust and leaves settling on empty road below, UFO lights dim slightly, silent and ominous, wide cinematic shot, photorealistic, masterpiece, 8K"
    },
    {
        "name": "clip15_departure",
        "prompt": "Final wide shot as the massive UFO silently ascends vertically into the night sky, lights pulsing rhythmically, shrinking against starry background until it vanishes with a final subtle flash, empty country road below now completely still under moonlight, lingering atmospheric fog, long lingering shot fading to black, ultra-realistic cinematic ending, masterpiece, 8K raw"
    }
]

def build_t2i_workflow(prompt, negative, output_name, width=1280, height=720, seed=None):
    """Build SDXL text-to-image workflow using RealVisXL"""
    if seed is None:
        seed = int(time.time() * 1000) % 2**31

    return {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": "RealVisXL_V4.0.safetensors"
            }
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": prompt,
                "clip": ["1", 1]
            }
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": negative,
                "clip": ["1", 1]
            }
        },
        "4": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": 1
            }
        },
        "5": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0],
                "seed": seed,
                "steps": 30,
                "cfg": 7.0,
                "sampler_name": "dpmpp_2m_sde",
                "scheduler": "karras",
                "denoise": 1.0
            }
        },
        "6": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["5", 0],
                "vae": ["1", 2]
            }
        },
        "7": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["6", 0],
                "filename_prefix": output_name
            }
        }
    }

def build_t2v_video_workflow(prompt, negative, output_name, seed=None):
    """Build T2V workflow using WanVideo 14B with block swapping"""
    if seed is None:
        seed = int(time.time() * 1000) % 2**31

    return {
        "2": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {
                "model_name": "umt5-xxl-enc-bf16.safetensors",
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
                "negative_prompt": negative,
                "force_offload": True,
                "enable_enhanced_prompt": False,
                "enhanced_prompt_device": "gpu"
            }
        },
        "10": {
            "class_type": "WanVideoBlockSwap",
            "inputs": {
                "blocks_to_swap": 35,
                "offload_img_emb": True,
                "offload_txt_emb": True
            }
        },
        "4": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": "Wan2_2-T2V-A14B_HIGH_fp8_e4m3fn_scaled_KJ.safetensors",
                "base_precision": "fp16",
                "quantization": "fp8_e4m3fn_scaled",
                "load_device": "offload_device",
                "attention": "sdpa",
                "block_swap_args": ["10", 0]
            }
        },
        "5": {
            "class_type": "WanVideoVAELoader",
            "inputs": {
                "model_name": "Wan2_2_VAE_bf16.safetensors",
                "precision": "bf16"
            }
        },
        "6": {
            "class_type": "WanVideoEmptyEmbeds",
            "inputs": {
                "width": 720,
                "height": 480,
                "num_frames": 41
            }
        },
        "7": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["4", 0],
                "image_embeds": ["6", 0],
                "text_embeds": ["3", 0],
                "cfg": 6,
                "shift": 3,
                "steps": 20,
                "seed": seed,
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
                "enable_vae_tiling": True,
                "tile_x": 272,
                "tile_y": 272,
                "tile_stride_x": 144,
                "tile_stride_y": 128
            }
        },
        "9": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["8", 0],
                "frame_rate": 16,
                "loop_count": 0,
                "filename_prefix": output_name,
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

def wait_for_completion(prompt_id, timeout=1200):
    """Wait for workflow to complete"""
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
                    print(f"\nERROR: {status.get('messages', [])}")
                    return None
        except Exception as e:
            pass

        print(".", end="", flush=True)
        time.sleep(3)

    print("\nTimeout!")
    return None

def generate_stills():
    """Generate all 15 still images"""
    print("=== GENERATING 15 STILL IMAGES ===\n")

    for i, clip in enumerate(CLIPS, 1):
        print(f"[{i}/15] Generating: {clip['name']}")

        workflow = build_t2i_workflow(
            prompt=clip['prompt'],
            negative=NEGATIVE,
            output_name=f"ufo_{clip['name']}",
            width=1280,
            height=720,
            seed=42 + i  # Deterministic seeds for reproducibility
        )

        try:
            prompt_id = submit_workflow(workflow)
            print(f"  Submitted: {prompt_id}")

            result = wait_for_completion(prompt_id, timeout=300)
            if result:
                print(" Done!")
                # Extract output filename
                outputs = result.get("outputs", {})
                for node_id, node_out in outputs.items():
                    if "images" in node_out:
                        for img in node_out["images"]:
                            print(f"  Output: {img.get('filename')}")
            else:
                print(" FAILED!")
        except Exception as e:
            print(f"  ERROR: {e}")

        print()

def generate_videos():
    """Generate T2V for all clips"""
    print("\n=== GENERATING VIDEO CLIPS WITH T2V ===\n")

    for i, clip in enumerate(CLIPS, 1):
        print(f"[{i}/15] Generating video: {clip['name']}")

        workflow = build_t2v_video_workflow(
            prompt=clip['prompt'] + ", smooth cinematic motion, high quality video, 4K",
            negative=NEGATIVE,
            output_name=f"ufo_video_{clip['name']}",
            seed=42 + i
        )

        try:
            prompt_id = submit_workflow(workflow)
            print(f"  Submitted: {prompt_id}")

            result = wait_for_completion(prompt_id, timeout=900)
            if result:
                print(" Done!")
                outputs = result.get("outputs", {})
                for node_id, node_out in outputs.items():
                    if "gifs" in node_out:
                        for vid in node_out["gifs"]:
                            print(f"  Output: {vid.get('filename')}")
            else:
                print(" FAILED!")
        except Exception as e:
            print(f"  ERROR: {e}")

        print()

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "videos":
        generate_videos()
    else:
        generate_stills()
        print("\n" + "="*50)
        print("Stills complete! Run with 'videos' arg to animate:")
        print("  python ufo_generator.py videos")
