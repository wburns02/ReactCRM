#!/usr/bin/env python3
"""
RIFE Frame Interpolation for Alien Abduction Clips
Doubles frame count to extend clip duration
49 frames @ 16fps = 3 seconds -> 98 frames @ 16fps = 6 seconds
"""

import json
import urllib.request
import time
import glob
import os

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/will/ComfyUI/output"


def create_rife_workflow(video_path, output_prefix):
    """Create RIFE interpolation workflow"""
    return {
        "1": {
            "class_type": "VHS_LoadVideo",
            "inputs": {
                "video": video_path,
                "force_rate": 0,
                "force_size": "Disabled",
                "custom_width": 832,
                "custom_height": 480,
                "frame_load_cap": 0,
                "skip_first_frames": 0,
                "select_every_nth": 1
            }
        },
        "2": {
            "class_type": "RIFE VFI",
            "inputs": {
                "ckpt_name": "rife47.pth",
                "frames": ["1", 0],
                "clear_cache_after_n_frames": 10,
                "multiplier": 2,
                "fast_mode": True,
                "ensemble": True,
                "scale_factor": 1.0
            }
        },
        "3": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["2", 0],
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
        return len(q.get("queue_running", [])), len(q.get("queue_pending", []))
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
            print(f"  [{time.strftime('%H:%M:%S')}] Queue: {running} running, {pending} pending...")
        time.sleep(check_interval)


def find_clips():
    """Find all I2V clips ready for interpolation"""
    clips = {}
    # Find alien_clip_XX files
    for i in range(1, 16):
        pattern = f"{OUTPUT_DIR}/alien_clip_{i:02d}_*.mp4"
        matches = sorted(glob.glob(pattern))
        if matches:
            clips[i] = matches[-1]
    # Also check test clips
    for i in [1, 4]:
        pattern = f"{OUTPUT_DIR}/alien_i2v_test_{i:02d}_*.mp4"
        matches = sorted(glob.glob(pattern))
        if matches and i not in clips:
            clips[i] = matches[-1]
    return clips


def main():
    print("=" * 60)
    print("RIFE FRAME INTERPOLATION")
    print("Extending clips from ~3s to ~6s")
    print("=" * 60)

    # Check ComfyUI status
    running, pending = check_queue()
    if running == -1:
        print("ERROR: ComfyUI not responding on port 8188")
        return

    print(f"ComfyUI online! Queue: {running} running, {pending} pending")

    # Find clips
    clips = find_clips()
    print(f"\nFound {len(clips)} clips ready for interpolation")

    if len(clips) < 15:
        missing = [i for i in range(1, 16) if i not in clips]
        print(f"Missing scenes: {missing}")
        print("Waiting for I2V to complete...")
        return

    for scene_num, clip_path in sorted(clips.items()):
        print(f"\n{'='*50}")
        print(f"SCENE {scene_num}/15 - RIFE Interpolation")
        print(f"{'='*50}")
        print(f"Input: {os.path.basename(clip_path)}")

        output_name = f"alien_extended_{scene_num:02d}"
        print(f"Output: {output_name}")

        workflow = create_rife_workflow(clip_path, output_name)
        pid = queue_workflow(workflow)

        if pid:
            print(f"Queued: {pid}")
            print("Waiting for completion...")
            wait_for_completion()
            print(f"Scene {scene_num} interpolation COMPLETE!")
        else:
            print(f"FAILED to queue scene {scene_num}")

    print("\n" + "=" * 60)
    print("ALL CLIPS INTERPOLATED!")
    print("Output: /home/will/ComfyUI/output/alien_extended_*.mp4")
    print("=" * 60)


if __name__ == "__main__":
    main()
