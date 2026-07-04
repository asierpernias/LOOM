# LOOM -- Gestual theremin and mini-DAW

Loom transforms any webcam in a complete music controller: move your hand, change the instrument and controle the volume in real time. All the tracks can be uploaded directly to a multipist editor with real DAW tools.

## How does it work

1. The camera detects your hand with HandLandmarker of MediaPipe - 21 landmark for reference each hand.

2. At the same time the position of the wrist and the amount of fingers decide which instrument/pitch/volume is played. 

3. Tone.js synthesises the audio with reverb and delay, which you can control from the UI.

4. Each note can be recorded. Click REC, play and click STOP. The result will appear on the timeline, whit it's waveform, ready to be moved, cut, fadeded, duplicated or exported.

## UI

The app is designed as a workspace of screens (draggable, minimizable and height/width adjustable), instead of set layout. This so every user can set his own prefered layout of work.

· Camera \n
· Theremin Controls - reverb, delay, octave and the REC button <br>
· Tracks - list of tracks with solo/mute/arm/track volume <br>
· Transport - reproduction, bpm <br>
· Sequencer - create your own rythms from simple samples <br>

## Features

· Live detection of the hand <br>
· Recording peformance -> clip on Timeline with offline render <br>
· Complete timeline: move, cut, trim, duplicate, fade in/out, volume per clip, multiple selection for drag, context menu <br>
· Configurable snap (1/4, 1/8, 1/16, free) <br>
· Undo/Redo (patron command) - Ctrl Z / Ctrl Y <br>
· Export WAV / MIDI / MP3 <br>
· Save and load complete projects (.zip) <br>
· Visual indicator of recording <br>
· Mute / solo / arm for each tracklane <br>
· Available as a web and a as a desktop app (Windows, via Tauri) <br>

## How to use it

### Dependencies

- [Node.js](https://nodejs.org/) 18+ y npm
- Para compilar la versión de escritorio: [Rust](https://www.rust-lang.org/tools/install) y las dependencias de sistema de Tauri ([guía oficial](https://tauri.app/start/prerequisites/))
- Una cámara web (para la detección de gestos)

### Option 1 (releases)

Download the version deployed in Github Releases and install LOOM in yout desktop

### Option 2 (web (development))

```
npm install
npm run dev
```

### Option 3 (production build)

```
npm run build
npx serve dist
```

### Option 4 (Desktop Tauri)

```
npm run tauri build
```
 
The installer is in `src-tauri/target/release/bundle/`.

## How to use it

