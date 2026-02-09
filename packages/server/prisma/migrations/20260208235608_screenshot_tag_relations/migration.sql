/*
  Warnings:

  - You are about to drop the column `color` on the `tag_label` table. All the data in the column will be lost.
  - Made the column `tag` on table `tag_label` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."tag_label" DROP COLUMN "color",
ALTER COLUMN "tag" SET NOT NULL;

-- CreateIndex
CREATE INDEX "tag_label_tag_idx" ON "public"."tag_label"("tag");

-- AddForeignKey
ALTER TABLE "public"."screenshot" ADD CONSTRAINT "screenshot_tag_fkey" FOREIGN KEY ("tag") REFERENCES "public"."screenshot_tag"("tag") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tag_label" ADD CONSTRAINT "tag_label_tag_fkey" FOREIGN KEY ("tag") REFERENCES "public"."screenshot_tag"("tag") ON DELETE RESTRICT ON UPDATE CASCADE;
