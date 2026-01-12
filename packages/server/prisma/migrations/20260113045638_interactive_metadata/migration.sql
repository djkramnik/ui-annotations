-- AlterTable
ALTER TABLE "public"."interactive" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "public"."tag_label" (
    "id" SERIAL NOT NULL,
    "tag" TEXT,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "tag_label_pkey" PRIMARY KEY ("id")
);
