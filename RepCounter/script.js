import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

const video = document.getElementById("video");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

/** @type {BluetoothRemoteGATTCharacteristic} */
const connect = document.getElementById("connect");
let whipperCharacteristic;
const setBuffer = new Uint8Array([1]);

const fart = new Audio("audio/fart.mp3");
fart.volume = 1;
const goofyahh = new Audio("audio/goofyahh.mp3");

const allAudio = [fart, goofyahh];

let handmarkData = [];
let posemarkData;

const excludedPoseMarks = [11, 12, 15, 16, 17, 18, 19, 20, 21, 22];
const includedMarks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

let caughtMarks = [];

let touchingFace = false;
let userCaught = false;

function getDist(vec1, vec2) {
  if (vec1.constructor.name == "Vector" && vec2.constructor.name === "Vector") {
    let difx = vec2.x - vec1.x;
    let dify = vec2.y - vec1.y;

    let dist = Math.sqrt(difx ** 2 + dify ** 2);

    return dist;
  } else {
    //const vecError = new Error("Vector objects accepted only");
    //return vecError;
    throw new Error("Vector objects accepted only");
  }
}

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

async function connectDEV() {
  const device = await navigator.bluetooth.requestDevice({
    filters: [
      { services: ["4f8b9504-0c21-4994-b330-350b96a44b41".toLowerCase()] },
    ],
  });
  if (!device.gatt) {
    throw new Error("Device does not support gatt");
  }

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(
    "4f8b9504-0c21-4994-b330-350b96a44b41".toLowerCase()
  );

  whipperCharacteristic = await service.getCharacteristic(
    "d3311aa7-74a1-42de-83aa-e6014e590b44".toLowerCase()
  );
}

const dataView = new DataView(new ArrayBuffer(1));
async function sendTrigger(value, characteristic) {
  dataView.setUint8(0, value);
  await characteristic.writeValue(dataView);
}

connect.addEventListener("click", function () {
  connectDEV();
});

async function start() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
  });

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
  });
  video.srcObject = stream;

  // ✅ WAIT until the video actually has size
  video.addEventListener("loadeddata", () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log("Video ready:", video.videoWidth, video.videoHeight);

    function loop() {
      // ✅ SAFETY CHECK (prevents your crash)
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        requestAnimationFrame(loop);
        return;
      }

      const results = handLandmarker.detectForVideo(video, performance.now());

      if (results.landmarks.length > 0) {
        results.landmarks.forEach((hand) => {
          hand.forEach((point) => {
            point.x = 1 - point.x;
            //console.log(point.x);
          });
        });
        const indexTip = results.landmarks[0][20];
        const x = indexTip.x * canvas.width;
        const y = indexTip.y * canvas.height;

        handmarkData = results.landmarks;

        /*results.landmarks[0].forEach((value) => {
          ctx.beginPath();
          ctx.arc(
            value.x * canvas.width,
            value.y * canvas.height,
            8,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = "red";
          ctx.fill();
          ctx.closePath();
        });*/

        const thumbVector = new Vector(
          results.landmarks[0][4].x,
          results.landmarks[0][4].y
        );
        const pointerVector = new Vector(
          results.landmarks[0][8].x,
          results.landmarks[0][8].y
        );

        const palmVector = new Vector(
          results.landmarks[0][1].x,
          results.landmarks[0][1].y
        );
        const initialVector = new Vector(
          results.landmarks[0][0].x,
          results.landmarks[0][0].y
        );

        let distBetweenThumbandPointer = getDist(thumbVector, pointerVector);
      }

      requestAnimationFrame(loop);
    }

    loop(); // ✅ START ONLY AFTER VIDEO IS READY
  });
}

const pose = new Pose({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
  },
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: true,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

pose.onResults((results) => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  posemarkData = pose.onResults;
  results.poseLandmarks.forEach((value) => {
    value.x = 1 - value.x;
  });

  userCaught = false;
  caughtMarks = [];
  if (results.poseLandmarks) {

    for (let i = 0; i < results.poseLandmarks.length; i++) {
      ctx.font = "20px Ariel";
      ctx.fillStyle = "Red";
      ctx.fillText(
        `${i}`,
        results.poseLandmarks[i].x * canvas.width,
        results.poseLandmarks[i].y * canvas.height - 0.05 * canvas.height
      );

      let posemarkVector = new Vector(
        results.poseLandmarks[i].x * canvas.width,
        results.poseLandmarks[i].y * canvas.height
      );

      if (handmarkData && includedMarks.includes(i)) {
        handmarkData.forEach((hand) => {
          hand.forEach((point) => {
            let landmarkData = new Vector(
              point.x * canvas.width,
              point.y * canvas.height
            );

            if (
              getDist(landmarkData, posemarkVector) <= 35 &&
              getDist(landmarkData, posemarkVector) != 0
            ) {
              userCaught = true;
              caughtMarks.push(point);

              let lockOutVector = new Vector(
                (landmarkData.x + posemarkVector.x) / 2,
                (landmarkData.y + posemarkVector.y) / 2
              );

              ctx.beginPath();
              ctx.globalAlpha = 0.6;
              ctx.fillStyle = "red";
              ctx.arc(
                lockOutVector.x,
                lockOutVector.y,
                getDist(lockOutVector, landmarkData) * 3.5,
                0,
                Math.PI * 2,
                true
              );
              ctx.fill();
              ctx.stroke();

            }
          });
        });

      }
    }

    if (userCaught && handmarkData) {
      if (touchingFace == false) {
        touchingFace = true;
        if (whipperCharacteristic) {
          sendTrigger(1, whipperCharacteristic);
        }
        allAudio.forEach((audio) => {
          audio.play();
        });
        window.setTimeout(function () {
          caughtMarks.forEach((mark) => {
            mark.x = 0;
            mark.y = 0;
          });
        }, 5000);
      } else {
        if (whipperCharacteristic) {
          sendTrigger(1, whipperCharacteristic);
        }
      }
    } else {
      if (whipperCharacteristic) {
        sendTrigger(0, whipperCharacteristic);
      }
      touchingFace = false;
      allAudio.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }

  }

});

const camera = new Camera(video, {
  onFrame: async () => {
    await pose.send({ image: video });
  },
  width: canvas.width,
  height: canvas.height,
});

camera.start();
start();
