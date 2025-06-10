-- CreateTable
CREATE TABLE "annotations" (
    "id" SERIAL NOT NULL,
    "scroll_y" INTEGER NOT NULL,
    "view_width" INTEGER NOT NULL,
    "view_height" INTEGER NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "url" VARCHAR(50) NOT NULL,
    "payload" JSONB NOT NULL,
    "screenshot" BYTEA,

    CONSTRAINT "annotations_pkey" PRIMARY KEY ("id")
);
