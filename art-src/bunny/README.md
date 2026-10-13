# The cream bunny: sources

- `bare-cut.png`: the owner-supplied bare bunny (AI-generated, Muse; 1600x1600 webp, Oct 13 2026) with
  its background removed (rembg ISNet, pymatting foreground estimation).
- `animate.py`: makes the idle loop's 143 frames (24 fps, 5.96 s, seamless) from it with code:
  breathing, a ±1° sway, the ears a beat behind, and one blink of both eyes.
- `moods.py`: makes the face stills in the clip's own frame: idle, the blink overlay, and cheer, think,
  wait and sleepy (closed-eye arcs, turned beads and a small head tilt), plus the head poses
  for the dress-up pieces (`animalArt.json` `pose`).
- `idle.master.webm`: the near-lossless master (VP9 with alpha, crf 10). The iPhone's HEVC `.mov` is
  made from it on a Mac. Run the "Animal clip for iPhone (.mov)" workflow, or do it locally:
  `ffmpeg -c:v libvpx-vp9 -i idle.master.webm -c:v hevc_videotoolbox -alpha_quality 0.75 -tag:v hvc1 idle.mov`
