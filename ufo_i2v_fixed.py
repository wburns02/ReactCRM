#!/usr/bin/env python3
"""
UFO Abduction - I2V Animation from Reference Images (FIXED)
Uses wan2.2-i2v-rapid-aio model (has k_img weights) with Wan2.1 VAE (z_dim=16)
15 clips x 4 seconds = 60 seconds total
"""

import json
import time
import urllib.request

COMFYUI_URL = "http://127.0.0.1:8188"

# Global negative prompt for ALL clips
NEGATIVE = "blurry, deformed, ugly, low resolution, artifacts, cartoon, anime, overexposed, underexposed, watermark, text, bad anatomy, mutated hands, extra limbs, jerky motion, flickering, low quality, grainy, compressed, unrealistic faces, plastic skin, exaggerated cartoonish expressions, poor lighting, flat colors, static pose, clothing glitches"

# All 15 clips with exact prompts
CLIPS = [
    {
        "name": "clip01_establishing",
        "image": "ufo_clip01_establishing_00001_.png",
        "positive": "Cinematic ultra-realistic establishing shot, photorealistic 4K movie footage like Denis Villeneuve: vast dark rural Texas country road at midnight under a clear starry sky with faint Milky Way, subtle moonlight casting long shadows, a lone mid-30s athletic Caucasian man in dark leather jacket, black shirt, jeans and boots walking slowly down the center of the empty asphalt road away from camera, wide-angle tracking shot from behind, gentle camera drift, rolling hills and distant trees silhouetted, cool blue moonlight with warm distant farmhouse light on horizon, atmospheric fog near ground, high dynamic range, sharp stars, masterpiece, best quality, 8K raw"
    },
    {
        "name": "clip02_tracking",
        "image": "ufo_clip02_tracking_00001_.png",
        "positive": "Ultra-realistic cinematic tracking shot following the man walking down dark country road at night, medium-wide shot from side angle, subtle moonlight illuminating his face showing calm but alert expression, leather jacket catching faint light, slow steady walk, wind gently moving his hair, distant cricket sounds implied, cool blue tones with deep shadows, volumetric fog swirling around boots, high contrast, photorealistic textures on asphalt and clothing, sharp focus, masterpiece, 8K"
    },
    {
        "name": "clip03_head_turn",
        "image": "ufo_clip03_head_turn_00001_.png",
        "positive": "Close-up side profile of the man walking, he suddenly stops and slowly turns his head upward toward the sky with growing curiosity, subtle moonlight on face, eyes widening slightly, faint green glow beginning to reflect in his eyes, leather jacket collar up, realistic skin texture and stubble, slow-motion head turn, cinematic depth of field with blurred background road, atmospheric night lighting, photorealistic, masterpiece, 8K raw"
    },
    {
        "name": "clip04_ufo_reveal",
        "image": "ufo_clip04_ufo_reveal_00001_.png",
        "positive": "Dramatic low-angle shot looking up past the man as a massive sleek metallic disc-shaped UFO silently emerges from behind clouds, pulsating soft blue-white lights around rim, subtle green glow underneath, stars obscured by its silhouette, man in foreground looking up in awe, wide lens cinematic composition, volumetric god rays breaking through clouds, ultra-realistic metallic reflections, high dynamic range, photorealistic, masterpiece, 8K"
    },
    {
        "name": "clip05_ufo_hover",
        "image": "ufo_clip05_ufo_hover_00001_.png",
        "positive": "Intense overhead shot of the massive UFO now fully visible hovering directly above the road, intricate metallic surface with glowing panels, rotating outer ring with rhythmic blue-white pulses, faint humming light effect, man below looking straight up, his face illuminated by eerie green light from below, dramatic upward camera tilt, realistic scale and detail, night sky background, photorealistic, masterpiece, 8K raw"
    },
    {
        "name": "clip06_beam_activate",
        "image": "ufo_clip06_beam_activate_00001_.png",
        "positive": "Sudden bright white tractor beam with glowing particles and energy sparks shoots down from center of UFO, illuminating the entire scene in harsh white light mixed with green edges, man bathed in beam looking up in shock, wind picking up, jacket flapping, debris and dust swirling upward, extreme contrast lighting, volumetric beam cutting through night fog, photorealistic energy effects, masterpiece, 8K"
    },
    {
        "name": "clip07_terror_face",
        "image": "ufo_clip07_terror_face_00001_.png",
        "positive": "Extreme close-up on the man's terrified face inside the tractor beam, wide-eyed pure horror, mouth open in silent scream, sweat beads forming on forehead catching light, veins in neck straining, eyes reflecting green UFO lights, ultra-detailed skin pores and realistic fear expression, shallow depth of field, slow-motion, cinematic horror lighting, photorealistic, masterpiece, 8K raw"
    },
    {
        "name": "clip08_feet_leaving",
        "image": "ufo_clip08_feet_leaving_00001_.png",
        "positive": "Medium shot from side as the man begins to lift off the ground feet first, boots dangling, legs kicking slightly in panic, jacket and shirt rippling upward from anti-gravity force, glowing particles swirling around body, tractor beam intensely bright with energy distortion, night road below receding, realistic physics and fabric movement, photorealistic, masterpiece, 8K"
    },
    {
        "name": "clip09_midair_struggle",
        "image": "ufo_clip09_midair_struggle_00001_.png",
        "positive": "Dynamic shot of the man fully airborne 10 feet up, twisting and clawing at the air in desperation, arms reaching downward, face contorted in terror, hair and jacket whipping wildly, bright tractor beam with visible heat distortion and floating dust, UFO looming above, dramatic low-angle looking up, high dynamic range, photorealistic motion, masterpiece, 8K"
    },
    {
        "name": "clip10_slow_ascent",
        "image": "ufo_clip10_slow_ascent_00001_.png",
        "positive": "Slow-motion upward tracking shot as the man ascends toward the underside of the UFO, beam particles flowing past him, his body silhouetted against bright light, arms outstretched, face still showing raw fear, intricate UFO underside details visible with glowing panels opening slightly, volumetric light rays, ultra-realistic, cinematic, masterpiece, 8K raw"
    },
    {
        "name": "clip11_beam_core",
        "image": "ufo_clip11_beam_core_00001_.png",
        "positive": "Intense close-up inside the tractor beam core, man surrounded by swirling energy particles and sparks, face illuminated harshly from below, eyes squinting against brightness, mouth open screaming, skin glistening with sweat, ultra-detailed textures, surreal yet photorealistic energy field, slow-motion ascent, masterpiece, 8K"
    },
    {
        "name": "clip12_approaching_hatch",
        "image": "ufo_clip12_approaching_hatch_00001_.png",
        "positive": "Point-of-view style shot from man's perspective looking up as he nears the open glowing hatch on UFO underside, bright white-green light pouring out, intricate alien metallic architecture, energy field rippling, his hands visible reaching out in final panic, disorienting camera movement, ultra-realistic sci-fi detail, masterpiece, 8K raw"
    },
    {
        "name": "clip13_final_pull",
        "image": "ufo_clip13_final_pull_00001_.png",
        "positive": "Dramatic silhouette shot as the man is pulled fully into the bright open hatch of the UFO, body disappearing into blinding white light, outline visible for a moment before vanishing, energy particles rushing inward, camera shaking slightly, intense lens flare, photorealistic, cinematic climax, masterpiece, 8K"
    },
    {
        "name": "clip14_hatch_closing",
        "image": "ufo_clip14_hatch_closing_00001_.png",
        "positive": "Exterior shot of UFO underside as the glowing hatch iris closes smoothly after abduction, tractor beam shuts off abruptly plunging scene back into moonlight, remaining dust and leaves settling on empty road below, UFO lights dim slightly, silent and ominous, wide cinematic shot, photorealistic, masterpiece, 8K"
    },
    {
        "name": "clip15_departure",
        "image": "ufo_clip15_departure_00001_.png",
        "positive": "Final wide shot as the massive UFO silently ascends vertically into the night sky, lights pulsing rhythmically, shrinking against starry background until it vanishes with a final subtle flash, empty country road below now completely still under moonlight, lingering atmospheric fog, long lingering shot fading to black, ultra-realistic cinematic ending, masterpiece, 8K raw"
    }
]

def build_i2v_workflow(image_filename, positive_prompt, output_name, seed=None):
    """
    Build I2V workflow using:
    - wan2.2-i2v-rapid-aio model (has k_img weights for proper I2V conditioning)
    - Wan2_1 VAE (z_dim=16, required for 36-channel input)
    - 65 frames for 4 seconds at 16fps
    """
    if seed is None:
        seed = int(time.time() * 1000) % 2**31

    return {
        # Load input image
        "1": {
            "class_type": "LoadImage",
            "inputs": {
                "image": image_filename
            }
        },
        # Load T5 text encoder
        "2": {
            "class_type": "LoadWanVideoT5TextEncoder",
            "inputs": {
                "model_name": "umt5-xxl-enc-bf16.safetensors",
                "precision": "bf16",
                "load_device": "offload_device",
                "quantization": "disabled"
            }
        },
        # Encode prompts
        "3": {
            "class_type": "WanVideoTextEncode",
            "inputs": {
                "t5": ["2", 0],
                "positive_prompt": positive_prompt,
                "negative_prompt": NEGATIVE,
                "force_offload": True,
                "enable_enhanced_prompt": False,
                "enhanced_prompt_device": "gpu"
            }
        },
        # Block swap for memory management
        "10": {
            "class_type": "WanVideoBlockSwap",
            "inputs": {
                "blocks_to_swap": 20,
                "offload_img_emb": True,
                "offload_txt_emb": True
            }
        },
        # Load I2V 14B LOW model (as per working configuration)
        "4": {
            "class_type": "WanVideoModelLoader",
            "inputs": {
                "model": "Wan2_2-I2V-A14B-LOW_fp8_e4m3fn_scaled_KJ.safetensors",
                "base_precision": "fp16",
                "quantization": "fp8_e4m3fn_scaled",
                "load_device": "offload_device",
                "attention": "sdpa",
                "block_swap_args": ["10", 0]
            }
        },
        # Load VAE - MUST use Wan2_1 VAE (z_dim=16) for 36-channel model
        "5": {
            "class_type": "WanVideoVAELoader",
            "inputs": {
                "model_name": "Wan2_1_VAE_bf16.safetensors",
                "precision": "bf16"
            }
        },
        # Image to Video Encode - 65 frames for 4 seconds at 16fps
        "6": {
            "class_type": "WanVideoImageToVideoEncode",
            "inputs": {
                "vae": ["5", 0],
                "start_image": ["1", 0],
                "width": 832,
                "height": 480,
                "num_frames": 65,
                "noise_aug_strength": 0.0,
                "start_latent_strength": 1.0,
                "end_latent_strength": 1.0,
                "force_offload": True,
                "fun_or_fl2v_model": False,
                "tiled_vae": False
            }
        },
        # Sampler
        "7": {
            "class_type": "WanVideoSampler",
            "inputs": {
                "model": ["4", 0],
                "image_embeds": ["6", 0],
                "text_embeds": ["3", 0],
                "cfg": 5.0,
                "shift": 5.0,
                "steps": 20,
                "seed": seed,
                "force_offload": True,
                "scheduler": "unipc",
                "riflex_freq_index": 0
            }
        },
        # Decode
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
        # Save video
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
    data = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=30)
    result = json.loads(resp.read().decode())
    return result.get("prompt_id")

def wait_for_completion(prompt_id, timeout=2400):
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
                                print(f"\n  ERROR: {err_info['exception_message'][:200]}")
                    return None
        except Exception as e:
            pass
        print(".", end="", flush=True)
        time.sleep(3)
    print("\n  TIMEOUT!")
    return None

def generate_single_test():
    """Generate a single test clip to verify the workflow works"""
    print("=" * 60)
    print("UFO I2V - SINGLE CLIP TEST")
    print("=" * 60)
    print("Using rapid-aio model (has k_img) + Wan2.1 VAE (z_dim=16)")
    print("=" * 60 + "\n")

    clip = CLIPS[0]  # Test with first clip
    print(f"Testing: {clip['name']}")
    print(f"  Image: {clip['image']}")
    print(f"  Prompt: {clip['positive'][:70]}...")

    workflow = build_i2v_workflow(
        image_filename=clip['image'],
        positive_prompt=clip['positive'],
        output_name=f"ufo_test_{clip['name']}",
        seed=42
    )

    try:
        prompt_id = submit_workflow(workflow)
        print(f"  Generating [{prompt_id[:8]}]", end="")
        result = wait_for_completion(prompt_id, timeout=1200)
        if result:
            outputs = result.get("outputs", {})
            for node_out in outputs.values():
                if "gifs" in node_out:
                    for vid in node_out["gifs"]:
                        print(f" -> {vid.get('filename')}")
                    break
            else:
                print(" DONE")
            return True
        else:
            print(" FAILED")
            return False
    except Exception as e:
        print(f" ERROR: {e}")
        return False

def generate_all_videos():
    print("=" * 60)
    print("UFO ABDUCTION - I2V FROM REFERENCE IMAGES (FIXED)")
    print("=" * 60)
    print("15 clips x 4 seconds = 60 seconds total")
    print("Resolution: 832x480, 65 frames")
    print("Model: wan2.2-i2v-rapid-aio (with k_img weights)")
    print("VAE: Wan2_1 (z_dim=16, matches model's 36 channels)")
    print("=" * 60 + "\n")

    for i, clip in enumerate(CLIPS, 1):
        print(f"[{i}/15] {clip['name']}")
        print(f"  Image: {clip['image']}")
        print(f"  Prompt: {clip['positive'][:70]}...")

        workflow = build_i2v_workflow(
            image_filename=clip['image'],
            positive_prompt=clip['positive'],
            output_name=f"ufo_i2v_fixed_{clip['name']}",
            seed=42 + i
        )

        try:
            prompt_id = submit_workflow(workflow)
            print(f"  Generating [{prompt_id[:8]}]", end="")
            result = wait_for_completion(prompt_id, timeout=2400)
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
    print("COMPLETE! Output: /home/will/ComfyUI/output/ufo_i2v_fixed_*.mp4")
    print("=" * 60)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        generate_single_test()
    else:
        generate_all_videos()
