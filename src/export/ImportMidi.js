import { Midi } from "@tonejs/midi";
import { trackManager } from "../core/TrackManager.js";
import { recorderEngine } from "../core/RecorderEngine.js";
import { InstrumentFactory } from "../instrumental/Instruments.js";

export async function importMidiFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const midi = new Midi(arrayBuffer);

    const allNotes = [];
    for (const midiTrack of midi.tracks) {
        for (const note of midiTrack.notes) {
            allNotes.push({
                note: note.name,
                start: note.time,
                duration: note.duration,
                velocity: note.velocity,
                instrument: "piano",
            });
        }
    }

    allNotes.sort((a, b) => a.start - b.start);

    if (allNotes.length === 0) {
        console.warn("El archivo no contiene notas");
        return null;
    }

    const totalDuration = Math.max(...allNotes.map(n => n.start + n.duration));

    const track = trackManager.createTrack({name: file.name});
    const clip = track.addClip({
        startTime: 0,
        duration: totalDuration,
        notes: allNotes,
    });

    await recorderEngine.renderClip(clip, InstrumentFactory);
    trackManager._notify();

    return track;
}