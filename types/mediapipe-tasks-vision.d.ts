declare module '@mediapipe/tasks-vision' {
  export class FilesetResolver {
    static forVisionTasks(basePath: string): Promise<unknown>;
  }

  export class FaceLandmarker {
    static createFromOptions(
      fileset: unknown,
      options: Record<string, unknown>,
    ): Promise<FaceLandmarker>;
    detectForVideo(video: HTMLVideoElement, timestampMs: number): unknown;
  }
}
