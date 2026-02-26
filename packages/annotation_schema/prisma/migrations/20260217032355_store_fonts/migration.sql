-- CreateTable
CREATE TABLE "public"."font_asset" (
    "id" SERIAL NOT NULL,
    "sha1" TEXT NOT NULL,
    "ext" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "font_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."font_bundle" (
    "id" SERIAL NOT NULL,
    "slug" TEXT,
    "family" TEXT NOT NULL,
    "css_text" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "font_bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."font_bundle_asset" (
    "id" SERIAL NOT NULL,
    "font_bundle_id" INTEGER NOT NULL,
    "font_asset_id" INTEGER NOT NULL,

    CONSTRAINT "font_bundle_asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "font_asset_sha1_key" ON "public"."font_asset"("sha1");

-- CreateIndex
CREATE INDEX "font_bundle_family_idx" ON "public"."font_bundle"("family");

-- CreateIndex
CREATE INDEX "font_bundle_asset_font_asset_id_idx" ON "public"."font_bundle_asset"("font_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "font_bundle_asset_font_bundle_id_font_asset_id_key" ON "public"."font_bundle_asset"("font_bundle_id", "font_asset_id");

-- AddForeignKey
ALTER TABLE "public"."font_bundle_asset" ADD CONSTRAINT "font_bundle_asset_font_bundle_id_fkey" FOREIGN KEY ("font_bundle_id") REFERENCES "public"."font_bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."font_bundle_asset" ADD CONSTRAINT "font_bundle_asset_font_asset_id_fkey" FOREIGN KEY ("font_asset_id") REFERENCES "public"."font_asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
