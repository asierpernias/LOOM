import lamejs from "@breezystack/lamejs";
import { WavExporter } from "./WavExporter.js";

export class Mp3Exporter {
    static async exportProjectToMp3() {
        const audioBuffer = await WavExporter.renderProjectBuffer();
        const blob = this._encodeMp3(audioBuffer);
        this._downloadBlob(blob, "project.mp3");
    }

    static _encodeMp3(audioBuffer) {
        const channels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const kbps = 128;

        const encoder = new lamejs.Mp3Encoder(Math.min(channels, 2), sampleRate, kbps);

        const left = this._floatTo16BitPCM(audioBuffer.getChannelData(0));
        const right = channels > 1
            ? this._floatTo16BitPCM(audioBuffer.getChannelData(1))
            : left;
        
        const blockSize = 1152;const mp3Data = [];

        for (let i = 0; i < left.length; i += blockSize) {
            const leftChunk = left.subarray(i, i + blockSize);
            const rightChunk = right.subarray(i, i + blockSize);

            const mp3buf = channels > 1
                ? encoder.encodeBuffer(leftChunk, rightChunk)
                : encoder.encodeBuffer(leftChunk);

            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }
        }

        const finalBuf = encoder.flush();
        if (finalBuf.length > 0) {
            mp3Data.push(finalBuf);
        }

        return new Blob(mp3Data, {type: "audio/mp3"});
    }

    static _floatTo16BitPCM(floatData) {
        const output = new Int16Array(floatData.length);
        for (let i = 0; i < floatData.length; i++) {
            const sample = Math.max(-1, Math.min(1, floatData[i]));
            output[i] = sample * 0x7fff;
        }
        
        return output;
    }

    static _downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

}