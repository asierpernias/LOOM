import JSZip from "jszip";
import * as Tone from "tone";
import { trackManager } from "../core/TrackManager";
import { recorderEngine } from "../core/RecorderEngine";
import { InstrumentFactory } from "../instrumental/Instruments";
import { WavExporter } from "./WavExporter";
import { busyOverlay } from "../ui/BusyOverlay";

const PROJECT_VERSION = 1;

export async function saveProject(filename = "proyecto.zip") {
    busyOverlay.show("Guardando proyecto...");
    try {
        const zip = new JSZip();
        const clipsFolder = zip.folder("clips");

        const tracksData = [];

        for (const track of trackManager.getAllTracks()) {
            const clipsData = [];

            for (const clip of track.getClipsSorted()) {
                const hasNotes = clip.notes && clip.notes.length > 0;

                let audioFile = null;
                if (!hasNotes && clip.audioData) {
                    const wavBlob = WavExporter.bufferToWavBlob(clip.audioData);
                    const wavBuffer = await wavBlob.arrayBuffer();
                    audioFile = `clips/clip_${clip.id}.wav`;
                    clipsFolder.file(`clip_${clip.id}.wav`, wavBuffer);
                }

                clipsData.push({
                    id: clip.id,
                    startTime: clip.startTime,
                    duration: clip.duration,
                    trimStart: clip.trimStart ?? 0,
                    trimEnd: clip.trimEnd ?? 0,
                    notes: clip.notes ?? [],
                    audioFile,
                    fadeIn: clip.fadeIn ?? 0,
                    fadeOut: clip.fadeOut ?? 0,
                    volume: clip.volume ?? 1,
                });
            }

            tracksData.push({
                name: track.name,
                instrument: track.instrument,
                volume: track.volume,
                muted: track.muted,
                solo: track.solo,
                color: track.color,
                clips: clipsData,
            });
        }

        const projectJson = {
            version: PROJECT_VERSION,
            tracks: tracksData,
        };

        zip.file("project.json", JSON.stringify(projectJson, null, 2));

        const blob = await zip.generateAsync({type: "blob"});
        downloadBlob(blob, filename);
    } finally {
        busyOverlay.hide();
    }
    
}

export async function loadProject(file) {
    const zip = await JSZip.loadAsync(file);

    const projectFile = zip.file("project.json");
    if (!projectFile)  {
        throw new Error("El zip no contiene .json");
    }

    const projectJson = JSON.parse(await projectFile.async("string"));

    for (const tracksData of projectJson.tracks) {
        const track = trackManager.createTrack({
            name: tracksData.name,
            instrument: tracksData.instrument,
        });
        track.volume = tracksData.volume ?? 1;
        track.muted = tracksData.muted ?? false;
        track.solo = tracksData.solo ?? false;
        track.color = tracksData.color ?? track.color;

        for (const clipData of tracksData.clips) {
            const hasNotes = clipData.notes && clipData.notes.length > 0;

            let audioData = null;
            if (clipData.audioFile) {
                const wavEntry = zip.file(clipData.audioFile);
                if (wavEntry) {
                    const arrayBuffer = await wavEntry.async("arraybuffer");
                    audioData = await Tone.context.rawContext.decodeAudioData(arrayBuffer);
                }
            }

            const clip = track.addClip({
                startTime: clipData.startTime,
                duration: clipData.duration,
                trimStart: clipData.trimStart ?? 0,
                trimEnd: clipData.trimEnd ?? 0,
                notes: clipData.notes ?? [],
                audioData,
                fadeIn: clipData.fadeIn ?? 0,
                fadeOut: clipData.fadeOut ?? 0,
                volume: clipData.volume ?? 1,
            });

            if (hasNotes) {
                await recorderEngine.renderClip(clip, InstrumentFactory);
            }
        }
    }

    trackManager._notify();
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}