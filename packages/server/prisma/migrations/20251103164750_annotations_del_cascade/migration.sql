-- DropForeignKey
ALTER TABLE "public"."annotation" DROP CONSTRAINT "annotation_screenshot_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."annotation" ADD CONSTRAINT "annotation_screenshot_id_fkey" FOREIGN KEY ("screenshot_id") REFERENCES "public"."screenshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
