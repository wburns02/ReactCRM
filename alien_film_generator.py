#!/usr/bin/env python3
"""
Alien Abduction Film Generator - Single GPU Operation
Uses only GPU 0 (port 8188) to avoid power issues
"""

import json
import urllib.request
import time

COMFYUI_URL = "http://127.0.0.1:8188"

# Main character description (consistent across all scenes)
MAIN_CHARACTER = """mid-30s athletic Caucasian man, short dark brown hair, rugged handsome features with light stubble, wearing a dark brown leather jacket over a black t-shirt, blue jeans, brown boots"""

# Global negative prompt
NEGATIVE_PROMPT = """cartoon, anime, illustration, painting, drawing, blurry, low quality, distorted, ugly, deformed, watermark, text, logo, oversaturated, plastic skin, mannequin, extra limbs, extra fingers, mutated hands, bad anatomy, bad proportions"""

# 15 Scene prompts for the alien abduction film
SCENE_PROMPTS = [
    # Scene 1: Establishing shot - Rural night
    f"Ultra photorealistic cinematic wide shot of a {MAIN_CHARACTER}, standing alone on a dark rural dirt road at night, his old pickup truck with headlights on behind him, looking up at the starry sky with curiosity, moonlit cornfields on both sides, eerie atmosphere, cinematic lighting, 8K, shot on ARRI Alexa, movie still",

    # Scene 2: Strange lights appear
    f"Ultra photorealistic cinematic shot of a {MAIN_CHARACTER}, face illuminated by strange pulsing lights from above, expression changing from curiosity to concern, looking up at the sky, rural night setting, mysterious green and blue lights reflecting on his face, 8K, hyper-detailed, cinematic",

    # Scene 3: UFO reveals itself
    f"Ultra photorealistic cinematic wide shot showing massive dark metallic UFO hovering silently above cornfield, {MAIN_CHARACTER} in foreground looking up in disbelief, craft has glowing blue-green lights underneath, ominous atmosphere, night scene, volumetric lighting, 8K, movie still",

    # Scene 4: Terror sets in
    f"Ultra photorealistic cinematic close-up portrait of {MAIN_CHARACTER}, expression of sheer terror, eyes wide, mouth open, blue-green light from UFO illuminating his face from above, sweat on forehead, night scene, dramatic lighting, 8K, hyper-detailed skin texture",

    # Scene 5: Tractor beam activates
    f"Ultra photorealistic cinematic shot of {MAIN_CHARACTER} being hit by bright blue-white tractor beam from UFO above, his body starting to lift slightly off the ground, arms outstretched trying to grab something, terrified expression, particles of dust floating upward in the beam, 8K, cinematic",

    # Scene 6: Feet leaving ground
    f"Ultra photorealistic cinematic low angle shot showing {MAIN_CHARACTER}'s boots leaving the ground, floating upward in blue tractor beam, his hands reaching down desperately, rural road below, UFO lights above, dramatic perspective, 8K, movie still",

    # Scene 7: Rising into beam
    f"Ultra photorealistic cinematic shot of {MAIN_CHARACTER} floating upward in brilliant tractor beam, body horizontal, arms and legs flailing, expression of absolute terror, looking down at the ground getting farther away, his truck tiny below, 8K, volumetric lighting",

    # Scene 8: Approaching the craft
    f"Ultra photorealistic cinematic shot from below showing {MAIN_CHARACTER} rising toward the dark underbelly of the UFO, the opening of the craft glowing intensely above him, his silhouette against the light, desperate reaching hands, 8K, dramatic lighting",

    # Scene 9: Entering the ship
    f"Ultra photorealistic cinematic shot of {MAIN_CHARACTER} being pulled through circular opening in UFO hull, half his body inside, bright white light engulfing him, his terrified face looking back down at Earth one last time, 8K, cinematic",

    # Scene 10: Inside the craft - first glimpse
    f"Ultra photorealistic cinematic shot of {MAIN_CHARACTER} lying on metallic floor inside alien craft, disoriented, lifting his head, strange bio-mechanical walls with pulsing lights, cold blue-white interior lighting, vapor in the air, 8K, sci-fi horror atmosphere",

    # Scene 11: The examination room
    f"Ultra photorealistic cinematic wide shot of sterile alien examination room, {MAIN_CHARACTER} strapped to tilted metallic table, strange surgical instruments floating nearby, tall grey alien silhouettes in background, clinical cold lighting, 8K, terrifying atmosphere",

    # Scene 12: Face to face with alien
    f"Ultra photorealistic cinematic close-up of {MAIN_CHARACTER}'s terrified face, a grey alien hand with long fingers reaching toward his forehead, reflection of large black alien eyes visible in his wide eyes, tears streaming down his face, 8K, hyper-detailed",

    # Scene 13: The procedure
    f"Ultra photorealistic cinematic shot of {MAIN_CHARACTER} screaming on examination table, bright light shining into his eyes, alien instruments hovering above him, his body arched in pain, clinical alien environment, disturbing medical horror scene, 8K",

    # Scene 14: Release - falling back
    f"Ultra photorealistic cinematic shot of {MAIN_CHARACTER} falling through tractor beam back toward Earth, unconscious, limp body tumbling, UFO retreating into the night sky above, stars visible, dreamlike quality, 8K, cinematic motion blur",

    # Scene 15: Aftermath - dawn
    f"Ultra photorealistic cinematic wide shot of {MAIN_CHARACTER} lying unconscious in cornfield at dawn, first light of sunrise on horizon, his truck visible in distance with door still open, mysterious burn marks in crops around him, peaceful yet disturbing, 8K, movie still"
]


def queue_flux_image(prompt_text, filename, seed, steps=25):
    """Queue a Flux.1 image generation on GPU 0"""
    workflow = {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "flux1-dev-fp8.safetensors", "weight_dtype": "fp8_e4m3fn"}},
        "2": {"class_type": "DualCLIPLoader", "inputs": {"clip_name1": "clip_l.safetensors", "clip_name2": "t5xxl_fp8_e4m3fn.safetensors", "type": "flux"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "flux_ae.safetensors"}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": prompt_text}},
        "10": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": NEGATIVE_PROMPT}},
        "5": {"class_type": "EmptySD3LatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "6": {"class_type": "ModelSamplingFlux", "inputs": {"model": ["1", 0], "max_shift": 1.15, "base_shift": 0.5, "width": 1024, "height": 1024}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["6", 0], "positive": ["4", 0], "negative": ["10", 0], "latent_image": ["5", 0], "seed": seed, "steps": steps, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["3", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": filename}}
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


def wait_for_completion(check_interval=30):
    """Wait for queue to be empty"""
    while True:
        running, pending = check_queue()
        if running == 0 and pending == 0:
            return True
        if running == -1:
            print("  Warning: Could not check queue status")
        else:
            print(f"  Queue: {running} running, {pending} pending...")
        time.sleep(check_interval)


def generate_character_reference():
    """Generate the main character reference image"""
    print("=" * 60)
    print("GENERATING CHARACTER REFERENCE")
    print("=" * 60)

    char_prompt = f"""Ultra photorealistic cinematic portrait of a {MAIN_CHARACTER}. He has an expression of sheer terror and disbelief on his face, eyes wide, mouth slightly open. Dramatic blue-green tractor beam light illuminating him from above, casting eerie shadows. Night scene, rural setting, cinematic lighting, 8K, hyper-detailed skin texture, photorealistic, shot on ARRI Alexa, movie still"""

    pid = queue_flux_image(char_prompt, "alien_character_ref", seed=424242, steps=30)
    print(f"Queued character reference: {pid}")
    print("Waiting for completion...")
    wait_for_completion()
    print("Character reference COMPLETE!")
    return True


def generate_all_scenes():
    """Generate all 15 scene images sequentially"""
    print("=" * 60)
    print("GENERATING 15 SCENE IMAGES")
    print("=" * 60)

    for i, prompt in enumerate(SCENE_PROMPTS, 1):
        print(f"\n--- Scene {i}/15 ---")
        seed = 100000 + (i * 1111)  # Consistent seeds for reproducibility
        filename = f"alien_scene_{i:02d}"

        pid = queue_flux_image(prompt, filename, seed=seed, steps=25)
        print(f"Queued: {pid}")
        print("Waiting for completion...")
        wait_for_completion()
        print(f"Scene {i} COMPLETE!")

    print("\n" + "=" * 60)
    print("ALL 15 SCENES GENERATED!")
    print("=" * 60)
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("ALIEN ABDUCTION FILM - IMAGE GENERATOR")
    print("Single GPU Mode (GPU 0 only)")
    print("=" * 60)

    # Check if ComfyUI is online
    running, pending = check_queue()
    if running == -1:
        print("ERROR: ComfyUI not responding on port 8188")
        print("Please ensure ComfyUI is running")
        exit(1)

    print(f"ComfyUI online! Queue: {running} running, {pending} pending")

    # Generate character reference first
    generate_character_reference()

    # Then generate all scenes
    generate_all_scenes()

    print("\nImage generation phase complete!")
    print("Next: Run I2V generation on each scene image")
