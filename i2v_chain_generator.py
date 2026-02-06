#!/usr/bin/env python3
"""
I2V Chain Generator for 60-second continuous UFO Abduction video
Uses Wan 2.2 I2V model via ComfyUI API
"""

import os
import json
import time
import requests
import cv2
import tempfile
from pathlib import Path

COMFYUI_URL = "https://localhost-0.tailad2d5f.ts.net"
OUTPUT_DIR = Path("C:/Users/Will/crm-work/ReactCRM/i2v_chain_outputs")
WORKFLOW_TEMPLATE = Path("C:/Users/Will/.claude/projects/C--Users-Will-crm-work-ReactCRM/i2v_workflow.json")

# Target: ~60 seconds at 4s per clip = 15 clips
# First clip is T2V, remaining 14 are I2V continuation
TARGET_CLIPS = 15


def extract_last_frame(video_path: str, output_path: str):
    """Extract the last frame from a video file"""
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Seek to last frame
    cap.set(cv2.CAP_PROP_POS_FRAMES, total_frames - 1)
    ret, frame = cap.read()
    cap.release()

    if ret:
        cv2.imwrite(output_path, frame)
        print(f"Extracted frame {total_frames} from {video_path}")
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
        print(f"Uploaded {filename}: {result}")
        return result.get('name', filename)
    else:
        print(f"Upload failed: {response.status_code}")
        return None


def create_i2v_workflow(input_image: str, output_prefix: str, seed: int):
    """Create I2V workflow JSON with specified parameters"""
    with open(WORKFLOW_TEMPLATE, 'r') as f:
        workflow = json.load(f)

    # Update input image
    workflow["100"]["inputs"]["image"] = input_image

    # Update output filename prefix
    workflow["30"]["inputs"]["filename_prefix"] = output_prefix

    # Update seed for variation
    workflow["27"]["inputs"]["seed"] = seed

    return workflow


def queue_workflow(workflow: dict):
    """Queue a workflow and return the prompt_id"""
    url = f"{COMFYUI_URL}/prompt"
    data = {"prompt": workflow}

    response = requests.post(url, json=data, verify=False)
    if response.status_code == 200:
        result = response.json()
        return result.get('prompt_id')
    else:
        print(f"Queue failed: {response.status_code} - {response.text}")
        return None


def wait_for_completion(prompt_id: str, timeout: int = 900):
    """Wait for a job to complete"""
    start_time = time.time()

    while time.time() - start_time < timeout:
        response = requests.get(f"{COMFYUI_URL}/api/queue", verify=False)
        if response.status_code == 200:
            queue = response.json()
            running = queue.get('queue_running', [])

            # Check if our job is still running
            running_ids = [job[1] for job in running]
            if prompt_id not in running_ids:
                # Job finished - check history for output
                time.sleep(2)  # Brief delay to ensure history is updated
                return True

        elapsed = int(time.time() - start_time)
        print(f"  Waiting... {elapsed}s elapsed")
        time.sleep(30)

    print(f"Timeout after {timeout}s")
    return False


def get_output_filename(prompt_id: str):
    """Get the output filename from job history"""
    response = requests.get(f"{COMFYUI_URL}/api/history", verify=False)
    if response.status_code == 200:
        history = response.json()
        if prompt_id in history:
            job = history[prompt_id]
            outputs = job.get('outputs', {})
            for node_id, output in outputs.items():
                if 'gifs' in output:
                    for g in output['gifs']:
                        return g.get('filename')
    return None


def download_video(filename: str, output_path: str):
    """Download a video from ComfyUI output"""
    url = f"{COMFYUI_URL}/view?filename={filename}&type=output"
    response = requests.get(url, verify=False)

    if response.status_code == 200:
        with open(output_path, 'wb') as f:
            f.write(response.content)
        print(f"Downloaded {filename} -> {output_path}")
        return True
    return False


def concatenate_videos(video_list: list, output_path: str):
    """Concatenate multiple videos into one using cv2"""
    if not video_list:
        return False

    # Get properties from first video
    cap = cv2.VideoCapture(video_list[0])
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()

    # Create video writer
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
        print(f"  Added {video_path}")

    out.release()
    print(f"Concatenated {len(video_list)} videos -> {output_path} ({total_frames} frames)")
    return True


def main():
    """Main I2V chain generation loop"""
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    OUTPUT_DIR.mkdir(exist_ok=True)

    print("=" * 60)
    print("I2V Chain Generator - UFO Abduction 60s Video")
    print("=" * 60)

    # Start with existing test video as clip 1
    clip_videos = []
    first_clip = Path("C:/Users/Will/crm-work/ReactCRM/test_abduction_01.mp4")

    if first_clip.exists():
        clip_videos.append(str(first_clip))
        print(f"Clip 1: {first_clip} (T2V original)")
    else:
        print(f"ERROR: First clip not found: {first_clip}")
        return

    # Generate remaining clips via I2V
    for clip_num in range(2, TARGET_CLIPS + 1):
        print(f"\n{'=' * 60}")
        print(f"Generating Clip {clip_num}/{TARGET_CLIPS}")
        print("=" * 60)

        # Extract last frame from previous clip
        prev_clip = clip_videos[-1]
        frame_path = OUTPUT_DIR / f"frame_{clip_num:02d}.png"

        if not extract_last_frame(prev_clip, str(frame_path)):
            print(f"ERROR: Could not extract frame from {prev_clip}")
            break

        # Upload frame to ComfyUI
        uploaded_name = upload_image(str(frame_path), f"chain_frame_{clip_num:02d}.png")
        if not uploaded_name:
            print("ERROR: Could not upload frame")
            break

        # Create and queue I2V workflow
        seed = 12345 + clip_num * 100  # Vary seed for each clip
        output_prefix = f"i2v_chain_{clip_num:02d}"
        workflow = create_i2v_workflow(uploaded_name, output_prefix, seed)

        prompt_id = queue_workflow(workflow)
        if not prompt_id:
            print("ERROR: Could not queue workflow")
            break

        print(f"Queued job: {prompt_id}")

        # Wait for completion
        if not wait_for_completion(prompt_id):
            print("ERROR: Job timed out")
            break

        # Get output filename
        output_filename = get_output_filename(prompt_id)
        if not output_filename:
            print("ERROR: Could not find output file")
            # Try guessing the filename
            output_filename = f"{output_prefix}_00001.mp4"

        # Download the generated video
        local_path = OUTPUT_DIR / output_filename
        if download_video(output_filename, str(local_path)):
            clip_videos.append(str(local_path))
            print(f"Clip {clip_num} complete: {local_path}")
        else:
            print(f"ERROR: Could not download {output_filename}")
            break

    # Concatenate all clips
    print(f"\n{'=' * 60}")
    print("Concatenating clips...")
    print("=" * 60)

    final_output = OUTPUT_DIR / "UFO_Abduction_60s_Final.mp4"
    if concatenate_videos(clip_videos, str(final_output)):
        # Get final video stats
        cap = cv2.VideoCapture(str(final_output))
        fps = cap.get(cv2.CAP_PROP_FPS)
        frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = frames / fps if fps > 0 else 0
        cap.release()

        print(f"\n{'=' * 60}")
        print("COMPLETE!")
        print("=" * 60)
        print(f"Final video: {final_output}")
        print(f"Duration: {duration:.2f}s")
        print(f"Clips: {len(clip_videos)}")
        print(f"Frames: {frames}")
    else:
        print("ERROR: Concatenation failed")


if __name__ == "__main__":
    main()
