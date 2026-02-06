#!/usr/bin/env python3
"""
Stitch all 15 UFO I2V clips into final 60-second video
"""

import subprocess
import os

OUTPUT_DIR = "/home/will/ComfyUI/output"
FINAL_OUTPUT = "/home/will/ufo_abduction_final_i2v.mp4"

def get_clip_files():
    """Get all completed clip files in order"""
    clips = []
    for i in range(1, 16):
        pattern = f"ufo_final_clip_{i:02d}_*.mp4"
        # Find the file
        import glob
        matches = glob.glob(os.path.join(OUTPUT_DIR, pattern))
        if matches:
            # Take the most recent one
            clips.append(sorted(matches)[-1])
        else:
            print(f"WARNING: Clip {i:02d} not found!")
    return clips

def create_concat_file(clips, concat_file="/tmp/concat_list.txt"):
    """Create ffmpeg concat file"""
    with open(concat_file, 'w') as f:
        for clip in clips:
            f.write(f"file '{clip}'\n")
    return concat_file

def stitch_videos(clips, output_file):
    """Stitch all clips together using ffmpeg"""
    concat_file = create_concat_file(clips)

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        output_file
    ]

    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode == 0:
        print(f"SUCCESS: Created {output_file}")
        # Get file size
        size = os.path.getsize(output_file) / (1024 * 1024)
        print(f"File size: {size:.1f} MB")
        return True
    else:
        print(f"ERROR: {result.stderr}")
        return False

def check_completion():
    """Check if all 15 clips are generated"""
    import glob
    completed = 0
    missing = []
    for i in range(1, 16):
        pattern = f"ufo_final_clip_{i:02d}_*.mp4"
        matches = glob.glob(os.path.join(OUTPUT_DIR, pattern))
        if matches:
            completed += 1
        else:
            missing.append(i)
    return completed, missing

def main():
    print("=" * 60)
    print("UFO ABDUCTION - FINAL VIDEO STITCHER")
    print("=" * 60)

    # Check completion status
    completed, missing = check_completion()
    print(f"Completed clips: {completed}/15")

    if missing:
        print(f"Missing clips: {missing}")
        print("Waiting for all clips to complete...")
        return False

    # Get all clips
    clips = get_clip_files()
    print(f"\nFound {len(clips)} clips:")
    for i, clip in enumerate(clips, 1):
        print(f"  {i:02d}: {os.path.basename(clip)}")

    if len(clips) != 15:
        print("\nERROR: Not all 15 clips found!")
        return False

    # Stitch together
    print(f"\nStitching into {FINAL_OUTPUT}...")
    success = stitch_videos(clips, FINAL_OUTPUT)

    if success:
        print("\n" + "=" * 60)
        print("FINAL VIDEO COMPLETE!")
        print(f"Output: {FINAL_OUTPUT}")
        print("=" * 60)

    return success

if __name__ == "__main__":
    main()
