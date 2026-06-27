import * as Tone from "tone";
import { trackManager } from "../core/TrackManager";

export async function importAudioFile(file) {
    const arraayBuffer = await file.arrayBuffer();
    const audioData = await Tone.context.rawContext.decodeAudioData(arrayBuffer);

    const track = trackManager.createTrack({name: file.name});

    track.addClip({
        audioData,
        startTime: 0,
        duration: audioData.duration,
        notes: [],
    });

    trackManager._notify();
    return track;
}