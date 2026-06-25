import * as Tone from "tone";
import  {trackManager} from "../core/TrackManager.js";

export class WavExporter {

    static async exportProjectToWav() {
        const duration = this._getProjectDuration();
        const buffer = await Tone.Offline(async () => {
            const tracks = trackManager.getAllTracks();

            for (const track of tracks) {
                if (track.muted) continue;

                for (const clip of track.getClipsSorted()) {
                    this._renderClip(track, clip);   
                }
            }

        }, duration);

        return this._toWav(buffer.get());
    }

    static _renderClip(track, clip) {
        if (clip.audioData) {
            const player = new Tone.Player(clip.audioData).toDestination();
            player.volume.value = this._volume(track.volume);
            player.start(clip.startTime);
        }

        if (clip.notes && clip.notes.length) {
            const synth = this._getSynth(track);

            for (const n of clip.notes) {
                synth.triggerAttackRelease(
                    n.note,
                    n.duration,
                    clip.startTime + n.start,
                    n.velocity ?? 1
                );
            }
        }
    }

    static _getProjectDuration() {
        const tracks = trackManager.getAllTracks();

        let max = 0;
        for (const t of tracks) {
            max = Math.max(max, t.getDuration());
        }

        return max;
    }

    static _getSynth(track) {
        if (!track._synth) {
            track._synth = new Tone.PolySynth(Tone.Synth).toDestination();
        }

        return track._synth;
    }

    static _volume(v) {
        return 20 * Math.log10(Math.max(v, 0.0001));
    }

    static _toWav(AudioBuffer) {
        const channels = AudioBuffer.numberOfChannels;
        const sampleRate = AudioBuffer.sampleRate;

        const length = AudioBuffer.length * channels * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);

        let offset = 0;

        const writeString = (s) => {
            for (let i = 0; i < s.length; i++) {
                view.setUint8(offset++, s.charCodeAt(i));
            }
        };

        const write16 = (v) => {
            view.setUint16(offset, v, true);
            offset += 2;
        };

        const write32 = (v) => {
            view.setUint32(offset, v, true);
            offset += 4;
        };
        
        writeString("RIFF");
        write32(length - 8);
        writeString("WAVE");

        writeString("fmt ");
        write32(16);
        write16(1);
        write16(channels);
        write32(sampleRate);
        write32(sampleRate  * channels * 2);
        write16(channels * 2);
        write16(16);

        writeString("data");
        write32(length - offset - 4);

        for (let i = 0; i < AudioBuffer.length; i++) {
            for (let ch = 0; ch  < channels; ch++) {
                let sample = AudioBuffer.getChannelData(ch)[i];
                sample = Math.max(-1, Math.min(1, sample));
                view.setInt16(offset, sample * 0x7fff, true);
                offset += 2;
            }
        }

        return new Blob([buffer], {type: "audio/wav"});
    }    
}
