-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."image_crop" (
    "id" SERIAL NOT NULL,
    "image_data" BYTEA NOT NULL,
    "true_id" UUID,
    "screenshot_id" INTEGER,
    "aspect_ratio" DOUBLE PRECISION NOT NULL,
    "og_width" INTEGER NOT NULL,
    "og_label" TEXT,

    CONSTRAINT "image_crop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."interactive" (
    "id" SERIAL NOT NULL,
    "image_data" BYTEA NOT NULL,
    "label" TEXT,
    "true_id" UUID,
    "screenshot_id" INTEGER,

    CONSTRAINT "interactive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ocr" (
    "id" SERIAL NOT NULL,
    "image_data" BYTEA NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "text" TEXT NOT NULL,
    "screenshot_id" INTEGER,

    CONSTRAINT "ocr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."screenshot" (
    "id" SERIAL NOT NULL,
    "scroll_y" INTEGER NOT NULL,
    "view_width" INTEGER NOT NULL,
    "view_height" INTEGER NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "url" TEXT NOT NULL,
    "annotations" JSONB NOT NULL,
    "image_data" BYTEA,
    "published" INTEGER NOT NULL DEFAULT 0,
    "tag" TEXT,
    "synthetic_parent_id" INTEGER,

    CONSTRAINT "annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "image_crop_annotationId_idx" ON "public"."image_crop"("screenshot_id");

-- CreateIndex
CREATE INDEX "interactive_annotationId_idx" ON "public"."interactive"("screenshot_id");

-- AddForeignKey
ALTER TABLE "public"."image_crop" ADD CONSTRAINT "image_crop_annotationId_fkey" FOREIGN KEY ("screenshot_id") REFERENCES "public"."screenshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."interactive" ADD CONSTRAINT "interactive_annotationId_fkey" FOREIGN KEY ("screenshot_id") REFERENCES "public"."screenshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ocr" ADD CONSTRAINT "ocr_annotationId_fkey" FOREIGN KEY ("screenshot_id") REFERENCES "public"."screenshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."screenshot" ADD CONSTRAINT "annotations_synthetic_parent_id_fkey" FOREIGN KEY ("synthetic_parent_id") REFERENCES "public"."screenshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

