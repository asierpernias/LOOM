# LOOM -- Gestual theremin and mini-DAW

Loom transforms any webcam in a complete music controller: move your hand, change the instrument and controle the volume in real time. All the tracks can be uploaded directly to a multipist editor with real DAW tools.

## How does it work

1. The camera detects your hand with HandLandmarker of MediaPipe - 21 landmark for reference each hand.

2. At the same time the position of the wrist and the amount of fingers decide which instrument/pitch/volume is played. 

3. Tone.js synthesises the audio with reverb and delay, which you can control from the UI.

4. Each note can be recorded. Click REC, play and click STOP. The result will appear on the timeline, whit it's waveform, ready to be moved, cut, fadeded, duplicated or exported.

## UI

The app is designed as a workspace of screens (draggable, minimizable and height/width adjustable), instead of set layout. This so every user can set his own prefered layout of work.

· Camera
· Theremin Controls - reverb, delay, octave and the REC button
· Tracks - list of tracks with solo/mute/arm/track volume
· Transport - reproduction, bpm
· Sequencer - create your own rythms from simple samples

## Features

· Live detection of the hand
· Recording peformance -> clip on Timeline with offline render
· Complete timeline: move, cut, trim, duplicate, fade in/out, volume per clip, multiple selection for drag, context menu
· Configurable snap (1/4, 1/8, 1/16, free)
· Undo/Redo (patron command) - Ctrl Z / Ctrl Y
· Export WAV / MIDI / MP3
· Save and load complete projects (.zip)
· Visual indicator of recording
· Mute / solo / arm for each tracklane
· Available as a web and a as a desktop app (Windows, via Tauri)

## How to use it

