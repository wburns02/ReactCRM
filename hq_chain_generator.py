#!/usr/bin/env python3
"""
High-Quality I2V Chain Generator for 60-second UFO Abduction Film
Uses Wan 2.2 T2V/I2V models via ComfyUI API
"""

import os
import json
import time
import requests
import cv2
from pathlib import Path
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

COMFYUI_URL = "https://localhost-0.tailad2d5f.ts.net"
OUTPUT_DIR = Path("C:/Users/Will/crm-work/ReactCRM/ufo_hq_outputs")
T2V_TEMPLATE = Path("C:/Users/Will/.claude/projects/C--Users-Will-crm-work-ReactCRM/hq_t2v_clip1.json")
I2V_TEMPLATE = Path("C:/Users/Will/.claude/projects/C--Users-Will-crm-work-ReactCRM/hq_i2v_template.json")

# Note: T2V model is Wan2_2-T2V-A14B_HIGH_fp8_e4m3fn_scaled_KJ.safetensors
# I2V model is Wan2_2-I2V-A14B-LOW_fp8_e4m3fn_scaled_KJ.safetensors

NEGATIVE_PROMPT = "blurry, deformed, ugly, low resolution, artifacts, cartoon, anime, overexposed, underexposed, watermark, text, bad anatomy, mutated hands, extra limbs, jerky motion, flickering, low quality, grainy, compressed, unrealistic faces, plastic skin, exaggerated cartoonish expressions, poor lighting, flat colors, static pose, clothing glitches"

# All 15 clip prompts
CLIP_PROMPTS = {
    1: "Cinematic ultra-realistic establishing shot, photorealistic 4K movie footage like Denis Villeneuve: vast dark rural Texas country road at midnight under a clear starry sky with faint Milky Way, subtle moonlight casting long shadows, a lone mid-30s athletic Caucasian man in dark leather jacket, black shirt, jeans and boots walking slowly down the center of the empty asphalt road away from camera, wide-angle tracking shot from behind, gentle camera drift, rolling hills and distant trees silhouetted, cool blue moonlight with warm distant farmhouse light on horizon, atmospheric fog near ground, high dynamic range, sharp stars, masterpiece, best quality, 8K raw",

    2: "Ultra-realistic cinematic tracking shot following the man walking down dark country road at night, medium-wide shot from side angle, subtle moonlight illuminating his face showing calm but alert expression, leather jacket catching faint light, slow steady walk, wind gently moving his hair, distant cricket sounds implied, cool blue tones with deep shadows, volumetric fog swirling around boots, high contrast, photorealistic textures on asphalt and clothing, sharp focus, masterpiece, 8K",

    3: "Close-up side profile of the man walking, he suddenly stops and slowly turns his head upward toward the sky with growing curiosity, subtle moonlight on face, eyes widening slightly, faint green glow beginning to reflect in his eyes, leather jacket collar up, realistic skin texture and stubble, slow-motion head turn, cinematic depth of field with blurred background road, atmospheric night lighting, photorealistic, masterpiece, 8K raw",

    4: "Dramatic low-angle shot looking up past the man as a massive sleek metallic disc-shaped UFO silently emerges from behind clouds, pulsating soft blue-white lights around rim, subtle green glow underneath, stars obscured by its silhouette, man in foreground looking up in awe, wide lens cinematic composition, volumetric god rays breaking through clouds, ultra-realistic metallic reflections, high dynamic range, photorealistic, masterpiece, 8K",

    5: "Intense overhead shot of the massive UFO now fully visible hovering directly above the road, intricate metallic surface with glowing panels, rotating outer ring with rhythmic blue-white pulses, faint humming light effect, man below looking straight up, his face illuminated by eerie green light from below, dramatic upward camera tilt, realistic scale and detail, night sky background, photorealistic, masterpiece, 8K raw",

    6: "Sudden bright white tractor beam with glowing particles and energy sparks shoots down from center of UFO, illuminating the entire scene in harsh white light mixed with green edges, man bathed in beam looking up in shock, wind picking up, jacket flapping, debris and dust swirling upward, extreme contrast lighting, volumetric beam cutting through night fog, photorealistic energy effects, masterpiece, 8K",

    7: "Extreme close-up on the man's terrified face inside the tractor beam, wide-eyed pure horror, mouth open in silent scream, sweat beads forming on forehead catching light, veins in neck straining, eyes reflecting green UFO lights, ultra-detailed skin pores and realistic fear expression, shallow depth of field, slow-motion, cinematic horror lighting, photorealistic, masterpiece, 8K raw",

    8: "Medium shot from side as the man begins to lift off the ground feet first, boots dangling, legs kicking slightly in panic, jacket and shirt rippling upward from anti-gravity force, glowing particles swirling around body, tractor beam intensely bright with energy distortion, night road below receding, realistic physics and fabric movement, photorealistic, masterpiece, 8K",

    9: "Dynamic shot of the man fully airborne 10 feet up, twisting and clawing at the air in desperation, arms reaching downward, face contorted in terror, hair and jacket whipping wildly, bright tractor beam with visible heat distortion and floating dust, UFO looming above, dramatic low-angle looking up, high dynamic range, photorealistic motion, masterpiece, 8K",

    10: "Slow-motion upward tracking shot as the man ascends toward the underside of the UFO, beam particles flowing past him, his body silhouetted against bright light, arms outstretched, face still showing raw fear, intricate UFO underside details visible with glowing panels opening slightly, volumetric light rays, ultra-realistic, cinematic, masterpiece, 8K raw",

    11: "Intense close-up inside the tractor beam core, man surrounded by swirling energy particles and sparks, face illuminated harshly from below, eyes squinting against brightness, mouth open screaming, skin glistening with sweat, ultra-detailed textures, surreal yet photorealistic energy field, slow-motion ascent, masterpiece, 8K",

    12: "Point-of-view style shot from man's perspective looking up as he nears the open glowing hatch on UFO underside, bright white-green light pouring out, intricate alien metallic architecture, energy field rippling, his hands visible reaching out in final panic, disorienting camera movement, ultra-realistic sci-fi detail, masterpiece, 8K raw",

    13: "Dramatic silhouette shot as the man is pulled fully into the bright open hatch of the UFO, body disappearing into blinding white light, outline visible for a moment before vanishing, energy particles rushing inward, camera shaking slightly, intense lens flare, photorealistic, cinematic climax, masterpiece, 8K",

    14: "Exterior shot of UFO underside as the glowing hatch iris closes smoothly after abduction, tractor beam shuts off abruptly plunging scene back into moonlight, remaining dust and leaves settling on empty road below, UFO lights dim slightly, silent and ominous, wide cinematic shot, photorealistic, masterpiece, 8K",

    15: "Final wide shot as the massive UFO silently ascends vertically into the night sky, lights pulsing rhythmically, becoming smaller against stars, empty country road below with settling dust, moonlight returning, vast empty landscape, haunting atmosphere, cinematic crane shot pulling back, photorealistic, masterpiece, 8K raw"
}


def extract_last_frame(video_path: str, output_path: str):
    """Extract the last frame from a video file"""
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames - 1)
    ret, frame = cap.read()
    cap.release()
    if ret:
        cv2.imwrite(output_path, frame)
        print(f"  Extracted frame {total_frames} -> {output_path}")
        return True
    return False


def upload_image(image_path: str, filename: str):
    """Upload an image to ComfyUI input folder"""
    url = f"{COMFYUI_URL}/upload/image"
    with open(image_path, 'rb') as f:
        files = {'image': (filename, f, 'image/png')}
        data = {'overwrite': 'true'}
        response = requests.post(url, files=files, data=data, verify=False)
    if response.status_code == 200:
        result = response.json()
        print(f"  Uploaded {filename}")
        return result.get('name', filename)
    else:
        print(f"  Upload failed: {response.status_code}")
        return None


def create_t2v_workflow(prompt: str, output_prefix: str, seed: int):
    """Create T2V workflow for Clip 1"""
    with open(T2V_TEMPLATE, 'r') as f:
        workflow = json.load(f)
    workflow["16"]["inputs"]["positive_prompt"] = prompt
    workflow["30"]["inputs"]["filename_prefix"] = output_prefix
    workflow["27"]["inputs"]["seed"] = seed
    return workflow


def create_i2v_workflow(input_image: str, prompt: str, output_prefix: str, seed: int):
    """Create I2V workflow for clips 2-15"""
    with open(I2V_TEMPLATE, 'r') as f:
        workflow = json.load(f)
    workflow["100"]["inputs"]["image"] = input_image
    workflow["16"]["inputs"]["positive_prompt"] = prompt
    workflow["30"]["inputs"]["filename_prefix"] = output_prefix
    workflow["27"]["inputs"]["seed"] = seed
    return workflow


def queue_workflow(workflow: dict):
    """Queue a workflow and return the prompt_id"""
    url = f"{COMFYUI_URL}/prompt"
    data = {"prompt": workflow}
    response = requests.post(url, json=data, verify=False)
    if response.status_code == 200:
        result = response.json()
        prompt_id = result.get('prompt_id')
        job_num = result.get('number')
        print(f"  Queued job #{job_num}: {prompt_id[:12]}...")
        return prompt_id
    else:
        print(f"  Queue failed: {response.status_code}")
        return None


def wait_for_completion(prompt_id: str, timeout: int = 1800):
    """Wait for a job to complete (30 min timeout for HQ)"""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"{COMFYUI_URL}/api/queue", verify=False, timeout=10)
            if response.status_code == 200:
                queue = response.json()
                running = queue.get('queue_running', [])
                running_ids = [job[1] for job in running]
                if prompt_id not in running_ids:
                    time.sleep(3)
                    return True
        except:
            pass
        elapsed = int(time.time() - start_time)
        mins = elapsed // 60
        secs = elapsed % 60
        print(f"    Generating... {mins}m {secs}s", end='\r')
        time.sleep(15)
    print(f"\n  Timeout after {timeout}s")
    return False


def get_output_filename(prompt_id: str):
    """Get the output filename from job history"""
    try:
        response = requests.get(f"{COMFYUI_URL}/api/history", verify=False, timeout=30)
        if response.status_code == 200:
            history = response.json()
            if prompt_id in history:
                outputs = history[prompt_id].get('outputs', {})
                for node_id, output in outputs.items():
                    if 'gifs' in output:
                        for g in output['gifs']:
                            return g.get('filename')
    except:
        pass
    return None


def download_video(filename: str, output_path: str):
    """Download a video from ComfyUI output"""
    url = f"{COMFYUI_URL}/view?filename={filename}&type=output"
    try:
        response = requests.get(url, verify=False, timeout=120)
        if response.status_code == 200:
            with open(output_path, 'wb') as f:
                f.write(response.content)
            size_mb = len(response.content) / (1024*1024)
            print(f"  Downloaded: {filename} ({size_mb:.1f} MB)")
            return True
    except Exception as e:
        print(f"  Download error: {e}")
    return False


def concatenate_videos(video_list: list, output_path: str):
    """Concatenate multiple videos into one"""
    if not video_list:
        return False

    cap = cv2.VideoCapture(video_list[0])
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    total_frames = 0
    for video_path in video_list:
        cap = cv2.VideoCapture(video_path)
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            out.write(frame)
            total_frames += 1
        cap.release()

    out.release()
    duration = total_frames / fps if fps > 0 else 0
    print(f"  Concatenated {len(video_list)} clips -> {duration:.1f}s ({total_frames} frames)")
    return True


def main():
    OUTPUT_DIR.mkdir(exist_ok=True)

    print("=" * 70)
    print("HIGH-QUALITY UFO ABDUCTION FILM GENERATOR")
    print("=" * 70)
    print(f"Resolution: 832x480 | Steps: 30 | CFG: 5.5 | FPS: 24")
    print(f"Clips: 15 | Target duration: ~60 seconds")
    print("=" * 70)

    clip_videos = []

    # === CLIP 1: T2V (Text-to-Video) ===
    print(f"\n{'='*70}")
    print("CLIP 1/15 - Establishing Shot (T2V)")
    print("="*70)

    workflow = create_t2v_workflow(CLIP_PROMPTS[1], "ufo_hq_clip_01", 42001)
    prompt_id = queue_workflow(workflow)

    if prompt_id and wait_for_completion(prompt_id):
        output_file = get_output_filename(prompt_id)
        if not output_file:
            output_file = "ufo_hq_clip_01_00001.mp4"

        local_path = OUTPUT_DIR / f"clip_01.mp4"
        if download_video(output_file, str(local_path)):
            clip_videos.append(str(local_path))
            print(f"  Clip 1 COMPLETE")
        else:
            print("  ERROR: Failed to download clip 1")
            return
    else:
        print("  ERROR: Clip 1 generation failed")
        return

    # === CLIPS 2-15: I2V (Image-to-Video) ===
    for clip_num in range(2, 16):
        print(f"\n{'='*70}")
        print(f"CLIP {clip_num}/15 - {get_clip_title(clip_num)} (I2V)")
        print("="*70)

        # Extract last frame from previous clip
        prev_clip = clip_videos[-1]
        frame_path = OUTPUT_DIR / f"frame_{clip_num:02d}.png"

        if not extract_last_frame(prev_clip, str(frame_path)):
            print(f"  ERROR: Could not extract frame")
            break

        # Upload frame
        uploaded_name = upload_image(str(frame_path), f"hq_frame_{clip_num:02d}.png")
        if not uploaded_name:
            print("  ERROR: Could not upload frame")
            break

        # Create and queue I2V workflow
        seed = 42000 + clip_num
        output_prefix = f"ufo_hq_clip_{clip_num:02d}"
        workflow = create_i2v_workflow(uploaded_name, CLIP_PROMPTS[clip_num], output_prefix, seed)

        prompt_id = queue_workflow(workflow)
        if not prompt_id:
            print("  ERROR: Could not queue workflow")
            break

        if not wait_for_completion(prompt_id):
            print("  ERROR: Generation timed out")
            break

        # Download output
        output_file = get_output_filename(prompt_id)
        if not output_file:
            output_file = f"{output_prefix}_00001.mp4"

        local_path = OUTPUT_DIR / f"clip_{clip_num:02d}.mp4"
        if download_video(output_file, str(local_path)):
            clip_videos.append(str(local_path))
            print(f"  Clip {clip_num} COMPLETE")
        else:
            print(f"  ERROR: Failed to download clip {clip_num}")
            break

    # === CONCATENATE ===
    if len(clip_videos) >= 2:
        print(f"\n{'='*70}")
        print("CONCATENATING CLIPS")
        print("="*70)

        final_output = OUTPUT_DIR / "UFO_Abduction_HQ_60s.mp4"
        concatenate_videos(clip_videos, str(final_output))

        # Get final stats
        cap = cv2.VideoCapture(str(final_output))
        fps = cap.get(cv2.CAP_PROP_FPS)
        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frames / fps if fps > 0 else 0
        cap.release()

        print(f"\n{'='*70}")
        print("GENERATION COMPLETE!")
        print("="*70)
        print(f"Final video: {final_output}")
        print(f"Duration: {duration:.1f} seconds")
        print(f"Clips: {len(clip_videos)}")
        print(f"Resolution: 832x480 @ 24fps")
    else:
        print("\nERROR: Not enough clips generated for final video")


def get_clip_title(num):
    titles = {
        1: "Establishing Wide Shot",
        2: "Closer Tracking Shot",
        3: "Man Notices Something",
        4: "UFO First Appearance",
        5: "UFO Hovering Overhead",
        6: "Tractor Beam Activates",
        7: "Close-Up Terror Face",
        8: "Feet Leaving Ground",
        9: "Mid-Air Struggle",
        10: "Slow Ascent",
        11: "Entering Beam Core",
        12: "Approaching UFO",
        13: "Final Pull Into Ship",
        14: "Hatch Closing",
        15: "UFO Departure"
    }
    return titles.get(num, f"Clip {num}")


if __name__ == "__main__":
    main()
