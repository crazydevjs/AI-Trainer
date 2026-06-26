// Stub for @mediapipe/pose. The pose-detection package statically imports the
// MediaPipe BlazePose model, but we only use MoveNet — this satisfies the
// `Pose` named import without pulling in the broken MediaPipe ESM module.
export class Pose {}
export default {};
