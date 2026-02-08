/*
  Warnings:

  - Made the column `tag` on table `screenshot` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."screenshot" ALTER COLUMN "tag" SET NOT NULL;
