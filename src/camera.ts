// Scatta una singola foto con la fotocamera del tablet.
// La fotocamera resta accesa solo per i pochi secondi dello scatto.

export type Facing = 'user' | 'environment';

const WARMUP_MS = 1500; // tempo per esposizione e messa a fuoco

export async function takePhoto(facing: Facing): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await new Promise((r) => setTimeout(r, WARMUP_MS));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    video.pause();
    video.srcObject = null;

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.85),
    );
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
