import * as Tone from "tone";
import  {trackManager} from "../core/TrackManager.js";

export class WavExporter {

    static async exportProjectToWav() {
        const buffer = await WavExporter.renderProjectBuffer();
        return this._toWav(buffer);
    }
     
    static async renderProjectBuffer(){
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

        return buffer.get();
    }

    static async exportClipsToWav(clips, filenam = "seleccion.wav") {
        const buffer = await this.renderClipsBuffer(clips);
        const blob = this._toWav(buffer);
        this._downloadBlob(blob, filename);
    }

    static async renderClipsBuffer(clips) {
        const duration = this._getClipsDuration(clips);
        const buffer = await Tone.Offline(async () => {
            for (const clip of clips) {
                this._renderClip(null, clip);
            }
        }, duration);
    }

    static _getClipsDuration() {
        let max = 0;
        for (const c of clips) {
            max = Math.max(max, c.endTime);
        }
        return max;
    }

    static _downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const  a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    static _renderClip(track, clip) {
        if (clip.audioData) {
            const player = new Tone.Player(clip.audioData).toDestination();
            player.volume.value = track ? this._volume(track.volume) : 0;
            player.start(clip.startTime);
        }

        if (clip.notes && clip.notes.length) {
            const synth = track ? this._getSynth(track) : this._getDefaultSynth();

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
    
    static _defaultSynth = null;
    static _getDefaultSynth() {
        if (!this._defaultSynth) {
            this._defaultSynth = new Tone.PolySynth(Tone.Synth).toDestination();
        }
        return this._defaultSynth;
    }
}
