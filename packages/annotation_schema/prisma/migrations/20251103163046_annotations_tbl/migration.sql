-- CreateTable
CREATE TABLE "public"."annotation" (
    "id" UUID NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "aspect_ratio" DOUBLE PRECISION NOT NULL,
    "screenshot_id" INTEGER NOT NULL,
    "clean" BOOLEAN NOT NULL DEFAULT false,
    "text_content" TEXT,

    CONSTRAINT "annotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "annotation_screenshot_id_idx" ON "public"."annotation"("screenshot_id");

-- AddForeignKey
ALTER TABLE "public"."annotation" ADD CONSTRAINT "annotation_screenshot_id_fkey" FOREIGN KEY ("screenshot_id") REFERENCES "public"."screenshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
