#!/usr/bin/env python3
"""
Monitor I2V generation progress and stitch when complete
"""

import json
import time
import urllib.request
import subprocess
import os
import glob

COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = "/home/will/ComfyUI/output"
FINAL_OUTPUT = "/home/will/ufo_abduction_final_i2v.mp4"

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

def check_completed_clips():
    """Check how many UFO clips are completed"""
    completed = []
    missing = []
    for i in range(1, 16):
        pattern = f"{OUTPUT_DIR}/ufo_final_clip_{i:02d}_*.mp4"
        matches = glob.glob(pattern)
        if matches:
            completed.append(i)
        else:
            missing.append(i)
    return completed, missing

def stitch_videos():
    """Stitch all clips together"""
    clips = []
    for i in range(1, 16):
        pattern = f"{OUTPUT_DIR}/ufo_final_clip_{i:02d}_*.mp4"
        matches = sorted(glob.glob(pattern))
        if matches:
            clips.append(matches[-1])

    if len(clips) != 15:
        print(f"ERROR: Only {len(clips)} clips found, need 15")
        return False

    # Create concat file
    concat_file = "/tmp/concat_list.txt"
    with open(concat_file, 'w') as f:
        for clip in clips:
            f.write(f"file '{clip}'\n")

    # Run ffmpeg
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_file,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        FINAL_OUTPUT
    ]

    print(f"Stitching {len(clips)} clips...")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        size = os.path.getsize(FINAL_OUTPUT) / (1024 * 1024)
        print(f"SUCCESS: Created {FINAL_OUTPUT} ({size:.1f} MB)")
        return True
    else:
        print(f"ERROR: {result.stderr[:200]}")
        return False

def main():
    print("=" * 60)
    print("UFO ABDUCTION - GENERATION MONITOR")
    print("=" * 60)
    print("Monitoring I2V clip generation...")
    print("Will stitch final video when all 15 clips complete")
    print("=" * 60 + "\n")

    check_interval = 60  # Check every 60 seconds
    last_completed = 0

    while True:
        completed, missing = check_completed_clips()
        running, pending = check_queue()

        if len(completed) != last_completed:
            print(f"\n[{time.strftime('%H:%M:%S')}] Progress: {len(completed)}/15 clips completed")
            if missing:
                print(f"  Missing: {missing}")
            if running >= 0:
                print(f"  Queue: {running} running, {pending} pending")
            last_completed = len(completed)

        if len(completed) == 15:
            print("\n" + "=" * 60)
            print("ALL 15 CLIPS COMPLETED!")
            print("=" * 60)
            print("\nStitching final video...")

            if stitch_videos():
                print("\n" + "=" * 60)
                print("FINAL VIDEO READY!")
                print(f"Output: {FINAL_OUTPUT}")
                print("=" * 60)
                return True
            else:
                print("ERROR: Stitching failed")
                return False

        # Check if queue is empty but clips incomplete
        if running == 0 and pending == 0 and len(completed) < 15:
            print(f"\nWARNING: Queue empty but only {len(completed)}/15 clips done!")
            print(f"Missing clips: {missing}")
            print("Some clips may have failed. Check ComfyUI for errors.")

        time.sleep(check_interval)

if __name__ == "__main__":
    main()
