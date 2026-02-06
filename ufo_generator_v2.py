#!/usr/bin/env python3
"""UFO Abduction Video Generator v2 - Fixed settings"""

import json
import time
import urllib.request

COMFYUI_URL = "http://127.0.0.1:8188"

NEGATIVE = "blurry, deformed, ugly, low resolution, artifacts, cartoon, anime, overexposed, watermark, text, bad anatomy, jerky motion, flickering, grainy"

CLIPS = [
    {"name": "clip01_establishing", "prompt": "Cinematic ultra-realistic establishing shot: vast dark rural Texas country road at midnight under clear starry sky with faint Milky Way, subtle moonlight casting long shadows, a lone mid-30s athletic Caucasian man in dark leather jacket walking slowly down the center of the empty asphalt road away from camera, wide-angle tracking shot, gentle camera drift, rolling hills, cool blue moonlight, atmospheric fog near ground, photorealistic, 8K"},
    {"name": "clip02_tracking", "prompt": "Ultra-realistic cinematic tracking shot following man walking down dark country road at night, medium-wide shot from side angle, subtle moonlight illuminating his face showing calm alert expression, leather jacket catching faint light, slow steady walk, wind gently moving his hair, cool blue tones with deep shadows, volumetric fog, photorealistic, 8K"},
    {"name": "clip03_head_turn", "prompt": "Close-up side profile of man walking, he suddenly stops and slowly turns his head upward toward the sky with growing curiosity, subtle moonlight on face, eyes widening slightly, faint green glow beginning to reflect in his eyes, leather jacket collar up, realistic skin texture and stubble, slow-motion head turn, cinematic depth of field, photorealistic, 8K"},
    {"name": "clip04_ufo_reveal", "prompt": "Dramatic low-angle shot looking up past the man as massive sleek metallic disc-shaped UFO silently emerges from behind clouds, pulsating soft blue-white lights around rim, subtle green glow underneath, stars obscured by its silhouette, man in foreground looking up in awe, volumetric god rays, ultra-realistic metallic reflections, photorealistic, 8K"},
    {"name": "clip05_ufo_hover", "prompt": "Intense overhead shot of massive UFO fully visible hovering directly above the road, intricate metallic surface with glowing panels, rotating outer ring with rhythmic blue-white pulses, man below looking straight up, face illuminated by eerie green light, dramatic upward camera tilt, realistic scale and detail, photorealistic, 8K"},
    {"name": "clip06_beam_activate", "prompt": "Sudden bright white tractor beam with glowing particles shoots down from center of UFO, illuminating entire scene in harsh white light mixed with green edges, man bathed in beam looking up in shock, wind picking up jacket flapping, debris and dust swirling upward, volumetric beam cutting through night fog, photorealistic, 8K"},
    {"name": "clip07_terror_face", "prompt": "Extreme close-up on man terrified face inside tractor beam, wide-eyed pure horror, mouth open in silent scream, sweat beads on forehead catching light, veins in neck straining, eyes reflecting green UFO lights, ultra-detailed skin pores and realistic fear expression, shallow depth of field, slow-motion, cinematic horror lighting, photorealistic, 8K"},
    {"name": "clip08_feet_leaving", "prompt": "Medium shot from side as man begins to lift off the ground feet first, boots dangling, legs kicking slightly in panic, jacket and shirt rippling upward from anti-gravity force, glowing particles swirling around body, tractor beam intensely bright, night road below receding, realistic physics and fabric movement, photorealistic, 8K"},
    {"name": "clip09_midair_struggle", "prompt": "Dynamic shot of man fully airborne 10 feet up, twisting and clawing at the air in desperation, arms reaching downward, face contorted in terror, hair and jacket whipping wildly, bright tractor beam with visible heat distortion, UFO looming above, dramatic low-angle looking up, photorealistic, 8K"},
    {"name": "clip10_slow_ascent", "prompt": "Slow-motion upward tracking shot as man ascends toward underside of UFO, beam particles flowing past him, body silhouetted against bright light, arms outstretched, face still showing raw fear, intricate UFO underside details with glowing panels opening, volumetric light rays, ultra-realistic, cinematic, 8K"},
    {"name": "clip11_beam_core", "prompt": "Intense close-up inside tractor beam core, man surrounded by swirling energy particles and sparks, face illuminated harshly from below, eyes squinting against brightness, mouth open screaming, skin glistening with sweat, ultra-detailed textures, surreal yet photorealistic energy field, slow-motion ascent, 8K"},
    {"name": "clip12_approaching_hatch", "prompt": "Point-of-view style shot from man perspective looking up as he nears open glowing hatch on UFO underside, bright white-green light pouring out, intricate alien metallic architecture, energy field rippling, his hands visible reaching out in final panic, disorienting camera movement, ultra-realistic sci-fi detail, 8K"},
    {"name": "clip13_final_pull", "prompt": "Dramatic silhouette shot as man is pulled fully into bright open hatch of UFO, body disappearing into blinding white light, outline visible for moment before vanishing, energy particles rushing inward, camera shaking slightly, intense lens flare, photorealistic, cinematic climax, 8K"},
    {"name": "clip14_hatch_closing", "prompt": "Exterior shot of UFO underside as glowing hatch iris closes smoothly after abduction, tractor beam shuts off abruptly plunging scene back into moonlight, remaining dust and leaves settling on empty road below, UFO lights dim slightly, silent and ominous, wide cinematic shot, photorealistic, 8K"},
    {"name": "clip15_departure", "prompt": "Final wide shot as massive UFO silently ascends vertically into night sky, lights pulsing rhythmically, shrinking against starry background until it vanishes with final subtle flash, empty country road below now completely still under moonlight, lingering atmospheric fog, long lingering shot fading to black, ultra-realistic cinematic ending, 8K"}
]

def build_t2v_workflow(prompt, negative, output_name, seed=None):
    """Build T2V workflow - 640x480, 33 frames, heavy memory optimization"""
    if seed is None:
        seed = int(time.time() * 1000) % 2**31

    return {
        "2": {"class_type": "LoadWanVideoT5TextEncoder", "inputs": {"model_name": "umt5-xxl-enc-bf16.safetensors", "precision": "bf16", "load_device": "offload_device", "quantization": "disabled"}},
        "3": {"class_type": "WanVideoTextEncode", "inputs": {"t5": ["2", 0], "positive_prompt": prompt, "negative_prompt": negative, "force_offload": True, "enable_enhanced_prompt": False, "enhanced_prompt_device": "gpu"}},
        "4": {"class_type": "WanVideoModelLoader", "inputs": {"model": "Wan2_2-TI2V-5B_fp8_e4m3fn_scaled_KJ.safetensors", "base_precision": "fp16", "quantization": "fp8_e4m3fn_scaled", "load_device": "main_device", "attention": "sdpa"}},
        "5": {"class_type": "WanVideoVAELoader", "inputs": {"model_name": "Wan2_2_VAE_bf16.safetensors", "precision": "bf16"}},
        "6": {"class_type": "WanVideoEmptyEmbeds", "inputs": {"width": 640, "height": 480, "num_frames": 33}},
        "7": {"class_type": "WanVideoSampler", "inputs": {"model": ["4", 0], "image_embeds": ["6", 0], "text_embeds": ["3", 0], "cfg": 6, "shift": 3, "steps": 20, "seed": seed, "force_offload": False, "scheduler": "dpm++_sde", "riflex_freq_index": 0}},
        "8": {"class_type": "WanVideoDecode", "inputs": {"vae": ["5", 0], "samples": ["7", 0], "enable_vae_tiling": True, "tile_x": 128, "tile_y": 128, "tile_stride_x": 64, "tile_stride_y": 64}},
        "9": {"class_type": "VHS_VideoCombine", "inputs": {"images": ["8", 0], "frame_rate": 16, "loop_count": 0, "filename_prefix": output_name, "format": "video/h264-mp4", "pix_fmt": "yuv420p", "crf": 19, "save_metadata": True, "trim_to_audio": False, "pingpong": False, "save_output": True}}
    }

def submit_workflow(workflow):
    data = json.dumps({"prompt": workflow}).encode()
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode()).get("prompt_id")

def wait_for_completion(prompt_id, timeout=900):
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
                        last = msgs[-1]
                        if isinstance(last, list) and len(last) > 1:
                            err = last[1].get('exception_message', 'Unknown error')
                            print(f"\nERROR: {err[:100]}")
                    return None
        except: pass
        print(".", end="", flush=True)
        time.sleep(3)
    print("\nTimeout!")
    return None

def generate_videos():
    print("=== GENERATING UFO VIDEO CLIPS (T2V) ===")
    print("Settings: 640x480, 33 frames (~2s each), 5B model on GPU\n")

    for i, clip in enumerate(CLIPS, 1):
        print(f"[{i}/15] {clip['name']}")

        workflow = build_t2v_workflow(
            prompt=clip['prompt'] + ", smooth cinematic motion, high quality video",
            negative=NEGATIVE,
            output_name=f"ufo_v2_{clip['name']}",
            seed=42 + i
        )

        try:
            prompt_id = submit_workflow(workflow)
            print(f"  Queued: {prompt_id[:8]}", end="")
            result = wait_for_completion(prompt_id, timeout=600)
            if result:
                outputs = result.get("outputs", {})
                for node_out in outputs.values():
                    if "gifs" in node_out:
                        for vid in node_out["gifs"]:
                            print(f" -> {vid.get('filename')}")
                        break
                else:
                    print(" Done")
            else:
                print(" FAILED")
        except Exception as e:
            print(f" ERROR: {e}")

if __name__ == "__main__":
    generate_videos()
