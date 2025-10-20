-- AlterTable
ALTER TABLE "public"."annotations" ADD COLUMN     "synthetic_parent_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."annotations" ADD CONSTRAINT "annotations_synthetic_parent_id_fkey" FOREIGN KEY ("synthetic_parent_id") REFERENCES "public"."annotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
