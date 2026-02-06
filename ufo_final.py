#!/usr/bin/env python3
"""
UFO Abduction Video - Final Version
12 clips x 5 seconds = 60 seconds total
Highly detailed prompts for maximum realism and eeriness
"""

import json
import time
import urllib.request

COMFYUI_URL = "http://127.0.0.1:8188"

# Negative prompt optimized for cinematic realism
NEGATIVE = "blurry, low quality, cartoon, anime, illustration, drawing, painting, watercolor, sketch, unrealistic, fake, CGI-looking, video game, plastic, overexposed, underexposed, motion blur, jerky, stuttering, flickering, artifacts, compression, noise, grain, distortion, warping, morphing, glitchy, pixelated, text, watermark, logo, bad anatomy, deformed, mutated, extra limbs"

# 12 clips x 5 seconds each = 60 seconds total
# Each prompt designed for maximum cinematic horror and realism
CLIPS = [
    {
        "name": "01_lonely_road",
        "prompt": """Hyper-realistic cinematic establishing shot, photorealistic 4K film footage: isolated rural highway cutting through vast Texas plains at 2AM, complete darkness except for distant stars and faint milky way, a single figure - athletic mid-30s man in worn leather jacket and jeans - walks alone down the center yellow line, shot from behind at low angle, his silhouette tiny against the immense dark landscape, cold blue moonlight casting long dramatic shadows, wispy ground fog drifting across cracked asphalt, distant dead trees silhouetted against sky, oppressive silence and isolation, slow tracking shot, Denis Villeneuve cinematography style, Arrival aesthetic, atmospheric dread, photorealistic textures, 8K raw footage"""
    },
    {
        "name": "02_something_watching",
        "prompt": """Ultra-realistic medium tracking shot following lone man walking on dark country road at night, handheld camera slight movement adds tension, he glances nervously over his shoulder multiple times sensing something wrong, leather jacket collar up against cold, visible breath in frigid air, moonlight catching his worried expression, deep shadows obscure surroundings, distant treeline seems to pulse with hidden presence, owl hoots in distance, wind picks up unnaturally, leaves skitter across road, building suspense and paranoia, horror film tension, photorealistic skin textures and fabric details, cinematic color grading with teal shadows, 8K masterpiece"""
    },
    {
        "name": "03_sky_anomaly",
        "prompt": """Intense POV-style shot looking up at night sky as man notices something wrong, stars begin disappearing in a circular pattern, clouds swirl unnaturally in spiral formation, strange greenish glow pulses behind cloud layer, his face in foreground lit by eerie otherworldly light from above, eyes wide with dawning terror, realistic fear expression with dilated pupils, sweat forming on brow despite cold, camera slowly tilts up revealing massive dark shape obscuring stars, building cosmic horror, volumetric fog illuminated by pulsing alien light, photorealistic atmospheric effects, Spielberg-style reveal, 8K cinematic"""
    },
    {
        "name": "04_ufo_emergence",
        "prompt": """Breathtaking wide shot as colossal disc-shaped UFO emerges silently from behind clouds, intricate metallic hull with subtle panel lines and geometric patterns, pulsating rings of soft blue-white lights around rim create ethereal glow, dark center with hints of internal machinery, craft easily 200 meters across, dwarfing the tiny human figure below, light refracts through atmospheric moisture creating god rays, stars visible around edges of craft, total silence except wind, man frozen in awe and terror looking up, masterful scale and composition, photorealistic metallic textures, volumetric lighting, 8K"""
    },
    {
        "name": "05_descent_hover",
        "prompt": """Dramatic low angle shot as massive UFO descends and hovers directly overhead, rotating outer ring with rhythmic blue-white light pulses casting moving shadows, intricate alien architecture on underside now visible - concentric circles, strange symbols, glowing panels, central aperture beginning to dilate open, man directly below looking up with face illuminated by shifting alien lights, his shadow stretching and rotating on asphalt below, electromagnetic interference causes his phone screen to flicker in pocket, absolute silence broken only by deep subsonic hum felt in chest, photorealistic detail, 8K"""
    },
    {
        "name": "06_beam_activation",
        "prompt": """Explosive moment as brilliant white tractor beam erupts from UFO's central aperture, column of intense light filled with swirling particles and energy sparks, beam illuminates entire area in harsh white-green light, man caught in center of beam looks up in pure shock and terror, his clothes and hair beginning to flutter upward against gravity, dust and debris spiraling up around him, atmospheric fog instantly vaporized, dramatic contrast between blinding beam and surrounding darkness, energy crackles and pulses, lens flare effects, photorealistic particle effects, 8K cinematic"""
    },
    {
        "name": "07_abduction_terror",
        "prompt": """Extreme close-up on man's face inside tractor beam, absolute primal terror captured in hyper-realistic detail, eyes wide showing whites all around, mouth open in silent scream, every pore and stubble visible, tears streaming from wind and fear, skin illuminated harshly from below by beam creating unsettling uplight, veins visible in straining neck, hands clawing uselessly at air in frame edges, hair standing straight up, sweat and tears catching light, slow motion horror, shallow depth of field, photorealistic skin texture, psychological horror at its peak, 8K raw"""
    },
    {
        "name": "08_levitation",
        "prompt": """Wide shot from ground level as man levitates 15 feet in air, body suspended unnaturally with arms and legs dangling, jacket and shirt billowing upward defying gravity, boots floating free, tractor beam intensely bright with visible energy distortion waves, particles streaming upward around him like reverse rain, his silhouette against the beam's blinding core, UFO's massive dark underside visible above, empty road and debris field below, surreal anti-gravity physics, photorealistic fabric dynamics and lighting, cinematic horror composition, 8K"""
    },
    {
        "name": "09_ascending",
        "prompt": """Dramatic tracking shot following man's slow ascent toward UFO's open aperture, camera rises with him, his body twisting and struggling weakly against invisible force, face still contorted in terror but strength fading, energy particles swirling densely around him creating almost cocoon effect, intricate details of UFO underside growing closer - alien metal, glowing conduits, strange mechanical iris dilating wider, ground receding below showing empty road and his dropped phone still glowing, claustrophobic horror, photorealistic, 8K"""
    },
    {
        "name": "10_final_pull",
        "prompt": """Harrowing POV shot from man's perspective looking up into UFO's interior aperture, blinding white-green light pouring out, strange geometric shapes and shadows visible within alien craft, his own hands reaching up in foreground in last desperate futile gesture, energy field crackling around his fingers, peripheral vision showing curved metallic walls of beam channel, disorienting spinning sensation, overwhelming brightness consuming frame, terror of the unknown, last moments of humanity, photorealistic hands and light effects, 8K"""
    },
    {
        "name": "11_disappearance",
        "prompt": """Exterior shot capturing exact moment man's silhouette vanishes into UFO's aperture, body swallowed by blinding light, brief dark outline visible for fraction of second before dissolving into radiance, beam still active but now empty, remaining particles and debris continuing to spiral upward, then sudden darkness as beam shuts off instantly, aperture iris closes smoothly with mechanical precision, UFO lights dim to standby pulse, utter silence returns, empty road below now completely still, photorealistic lighting transition, cinematic finality, 8K"""
    },
    {
        "name": "12_departure",
        "prompt": """Final haunting wide shot as massive UFO begins silent vertical ascent, lights pulsing in slow rhythm, craft rising smoothly through wisps of remaining fog, stars reappearing behind it as it shrinks into the night sky, camera holds on empty desolate road below - scattered debris, disturbed dust settling, dropped phone screen finally going dark, no trace of the man remains, absolute stillness and emptiness, UFO becoming distant point of light then vanishing with subtle flash, lingering dread, photorealistic night sky, fade to black, 8K cinematic masterpiece"""
    }
]

def build_t2v_workflow(prompt, negative, output_name, seed=None):
    """Build T2V workflow - 640x480, 81 frames (5 seconds at 16fps), 5B model"""
    if seed is None:
        seed = int(time.time() * 1000) % 2**31

    return {
        "2": {"class_type": "LoadWanVideoT5TextEncoder", "inputs": {"model_name": "umt5-xxl-enc-bf16.safetensors", "precision": "bf16", "load_device": "offload_device", "quantization": "disabled"}},
        "3": {"class_type": "WanVideoTextEncode", "inputs": {"t5": ["2", 0], "positive_prompt": prompt, "negative_prompt": negative, "force_offload": True, "enable_enhanced_prompt": False, "enhanced_prompt_device": "gpu"}},
        "4": {"class_type": "WanVideoModelLoader", "inputs": {"model": "Wan2_2-TI2V-5B_fp8_e4m3fn_scaled_KJ.safetensors", "base_precision": "fp16", "quantization": "fp8_e4m3fn_scaled", "load_device": "main_device", "attention": "sdpa"}},
        "5": {"class_type": "WanVideoVAELoader", "inputs": {"model_name": "Wan2_2_VAE_bf16.safetensors", "precision": "bf16"}},
        "6": {"class_type": "WanVideoEmptyEmbeds", "inputs": {"width": 640, "height": 480, "num_frames": 81}},
        "7": {"class_type": "WanVideoSampler", "inputs": {"model": ["4", 0], "image_embeds": ["6", 0], "text_embeds": ["3", 0], "cfg": 6.5, "shift": 3, "steps": 25, "seed": seed, "force_offload": False, "scheduler": "dpm++_sde", "riflex_freq_index": 0}},
        "8": {"class_type": "WanVideoDecode", "inputs": {"vae": ["5", 0], "samples": ["7", 0], "enable_vae_tiling": True, "tile_x": 128, "tile_y": 128, "tile_stride_x": 64, "tile_stride_y": 64}},
        "9": {"class_type": "VHS_VideoCombine", "inputs": {"images": ["8", 0], "frame_rate": 16, "loop_count": 0, "filename_prefix": output_name, "format": "video/h264-mp4",  "pix_fmt": "yuv420p", "crf": 17, "save_metadata": True, "trim_to_audio": False, "pingpong": False, "save_output": True}}
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
                        last = msgs[-1]
                        if isinstance(last, list) and len(last) > 1:
                            err = last[1].get('exception_message', 'Unknown error')
                            print(f"\n  ERROR: {err[:150]}")
                    return None
        except: pass
        print(".", end="", flush=True)
        time.sleep(3)
    print("\n  TIMEOUT!")
    return None

def generate_videos():
    print("=" * 60)
    print("UFO ABDUCTION - FINAL CINEMATIC VERSION")
    print("=" * 60)
    print("12 clips x 5 seconds = 60 seconds total")
    print("Resolution: 640x480, 81 frames, 5B model")
    print("=" * 60 + "\n")

    for i, clip in enumerate(CLIPS, 1):
        print(f"[{i}/12] {clip['name']}")
        print(f"  Prompt: {clip['prompt'][:80]}...")

        workflow = build_t2v_workflow(
            prompt=clip['prompt'],
            negative=NEGATIVE,
            output_name=f"ufo_cinematic_{clip['name']}",
            seed=42 + i
        )

        try:
            prompt_id = submit_workflow(workflow)
            print(f"  Generating", end="")
            result = wait_for_completion(prompt_id, timeout=900)
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
    print("Output files: /home/will/ComfyUI/output/ufo_cinematic_*.mp4")
    print("=" * 60)

if __name__ == "__main__":
    generate_videos()
