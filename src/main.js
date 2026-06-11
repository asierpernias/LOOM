const app = document.querySelector("#app");


const video = document.createElement("video");
video.autoplay = true;
video.playsInline = true;

video.style.width = "100%";
video.style.maxWidth = "600px";
video.style.border = "2px solid black";
video.style.borderRadius = "10px";

app.appendChild(video);

const canvas = document.createElement("canvas");
app.appendChild(canvas);

const ctx = canvas.getContext("2d");

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: true
    });

    video.srcObject = stream;
    await video.play();

    loop();
}

function loop() {
    if (video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0);
    }

    requestAnimationFrame(loop);
}

startCamera();