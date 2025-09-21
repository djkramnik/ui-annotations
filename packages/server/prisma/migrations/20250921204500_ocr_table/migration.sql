-- CreateTable
CREATE TABLE "public"."ocr" (
    "id" SERIAL NOT NULL,
    "screenshot" BYTEA NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "text" TEXT NOT NULL,
    "annotationId" INTEGER,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,

    CONSTRAINT "ocr_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ocr" ADD CONSTRAINT "ocr_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "public"."annotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
