import MidiWriter from "midi-writer-js";
import * as Tone from "tone";
import { busyOverlay } from "../ui/BusyOverlay.js";

const TICKS_PER_BEAT = 120;
const DEFAULT_BPM = 120;

function secondsToTicks(seconds, bpm = DEFAULT_BPM) {
    const beatsPerSecond = bpm / 60; 
    const beats = seconds * beatsPerSecond;
    return Math.round(beats * TICKS_PER_BEAT);
}

function noteToMidiNumber(note) {
    try {
        return Tone.Frequency(note).toMidi();
    } catch (err) {
        console.warn("Midiexporter: nota invalida", err);
        return null;
    }
}

/**
 * @param {Array<Clip>} clips
 * @param {number} bpm
 * @returns {MidiWritter.Track}
 */

function buildMidiTrackFromClips(clips, bpm = DEFAULT_BPM) {
    const track = new MidiWriter.Track();
    track.setTempo(bpm);

    const absoluteNotes = [];
    for (const clip of clips) {
        for (const n of clip.notes) {
            const midi = noteToMidiNumber(n.note);
            if (midi === null) continue;
            absoluteNotes.push({
                midi,
                absoluteStart: clip.startTime + n.start,
                duration: n.duration,
                velocity: n.velocity ?? 0.8,
            });
        }
    }
    absoluteNotes.sort((a, b) => a.absoluteStart - b.absoluteStart);
    let lastEventEndTicks = 0;

    for (const n of absoluteNotes) {
        const startTicks = secondsToTicks(n.absoluteStart, bpm);
        const durationTicks = Math.max(1, secondsToTicks(n.duration, bpm));
        const waitTicks = Math.max(0, startTicks - lastEventEndTicks);

        track.addEvent(
            new MidiWriter.NoteEvent({
                pitch: [n.midi],
                duration: "T" + durationTicks,
                wait: waitTicks > 0 ? "T" + waitTicks: undefined,
                velocity: Math.round((n.velocity ?? 0.8) * 100),
            })
        );

        lastEventEndTicks = startTicks + durationTicks;
    }

    return track;
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

/**
 * @param {Array<Clip>} clips
 * @param {string} filename
 * @param {number} bpm
 */

export function exportClipsToMidi(clips, filename = "export.mid", bpm = DEFAULT_BPM) {
    busyOverlay.show("Exportando MIDI...");
    try {
        if (!clips || clips.length === 0) {
            console.warn("No hay clips para exportar");
            return;
        }

        const midiTrack = buildMidiTrackFromClips(clips, bpm);
        const writer = new MidiWriter.Writer([midiTrack]);
        const blob = new Blob([writer.buildFile()], { type: "audio/midi"});

        downloadBlob(blob, filename);
    } finally {
        busyOverlay.hide();
    }
   
}


/**
 * @param {Array<import("../models/Track.js").Track>} tracks
 * @param {string} filename
 * @param {number} bpm
 */

export function exportAllTracksToMidi(tracks, filename = "proyecto.mid", bpm = DEFAULT_BPM) {
    busyOverlay.show("Exportando MIDI");

    try {
        const midiTracks = [];

        for (const track of tracks) {
            const clips = track.getClipsSorted();
            if (clips.length === 0) continue;

            const hasNotes = clips.some(c => c.notes && c.notes.length > 0);
            if (!hasNotes) continue;

            const midiTrack = buildMidiTrackFromClips(clips, bpm);
            midiTrack.addTrackName(track.name ?? "Track");
            midiTracks.push(midiTrack);
        }

        if (midiTracks.length === 0) {
            console.warn("Sin notas en las pistas");
            return;
        }

        const writer = new MidiWriter.Writer(midiTracks);
        const blob = new Blob([writer.buildFile()], {type: "audio/midi"});
        downloadBlob(blob, filename);
    } finally {
        busyOverlay.hide();
    }

}