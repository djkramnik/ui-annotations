-- CreateTable
CREATE TABLE "public"."image_crop" (
    "id" SERIAL NOT NULL,
    "screenshot" BYTEA NOT NULL,
    "true_id" UUID,
    "annotationId" INTEGER,
    "aspectRatio" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "image_crop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "image_crop_annotationId_idx" ON "public"."image_crop"("annotationId");

-- AddForeignKey
ALTER TABLE "public"."image_crop" ADD CONSTRAINT "image_crop_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "public"."annotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
