import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// Smart Wash media uploads. Keep client-side validation aligned with these limits.
export const ourFileRouter = {
  fileUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
    video: { maxFileSize: "16MB", maxFileCount: 1 },
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
  }).onUploadComplete(async ({ file }) => {
    console.info("[Smart Wash] media upload completed", {
      name: file.name,
      size: file.size,
      type: file.type,
      urlAvailable: Boolean(file.url || file.ufsUrl),
    });
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
