/*
  Warnings:

  - Added the required column `ogWidth` to the `image_crop` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."image_crop" ADD COLUMN     "ogWidth" INTEGER NOT NULL;
