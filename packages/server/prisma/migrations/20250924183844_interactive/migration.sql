-- CreateTable
CREATE TABLE "public"."interactive" (
    "id" SERIAL NOT NULL,
    "screenshot" BYTEA NOT NULL,
    "label" TEXT NOT NULL,
    "true_id" UUID,
    "annotationId" INTEGER,

    CONSTRAINT "interactive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interactive_annotationId_idx" ON "public"."interactive"("annotationId");

-- AddForeignKey
ALTER TABLE "public"."interactive" ADD CONSTRAINT "interactive_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "public"."annotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
