# README workflow animation

The ten-second schematic uses HTML, SVG, and a seekable GSAP timeline. It depicts the collaboration policy, not a recorded worker run. No generated imagery, voice, or music is used.

From this directory, with Node.js 22+ and FFmpeg installed:

```bash
npm run preview
npm run check
npm run render
```

The scripts pin HyperFrames 0.8.223. The first invocation may download that CLI and its browser runtime; local rendering uses FFmpeg. The composition uses the pinned GSAP 3.15.0 CDN script and HyperFrames font resolution. `Editorial` resolves to the local Georgia font on the authoring Mac; other hosts need that face for matching typography.

The capture canvas is 1280 by 552. The render script trims the lower padding to a 1280 by 464 delivery frame; all labels remain inside that frame.

Edit text and timing in `compositions/workflow.html`. The root `index.html` mounts the scene. `../workflow.html` and `../workflow-dark.html` are the editable static diagrams; the sibling SVGs are their exported versions.

To encode a compact GIF from the rendered MP4:

```bash
ffmpeg -y -i ../workflow.mp4 -filter_complex "[0:v]fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle" -loop 0 ../workflow.gif
```

The stroke-reveal technique follows the `svg-line-draw-loader` component in the [HyperFrames registry](https://github.com/heygen-com/hyperframes). Layout and artwork are original SVG. HyperFrames and GSAP retain their own licenses; this directory does not vendor either runtime.
