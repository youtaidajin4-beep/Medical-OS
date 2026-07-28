-- CreateTable
CREATE TABLE "consultation_chat_messages" (
    "id" TEXT NOT NULL,
    "consultation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_attachments" (
    "id" TEXT NOT NULL,
    "consultation_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "ocr_text" TEXT,
    "document_kind" TEXT NOT NULL DEFAULT 'other',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultation_chat_messages_consultation_id_created_at_idx" ON "consultation_chat_messages"("consultation_id", "created_at");

-- CreateIndex
CREATE INDEX "consultation_attachments_consultation_id_created_at_idx" ON "consultation_attachments"("consultation_id", "created_at");

-- AddForeignKey
ALTER TABLE "consultation_chat_messages" ADD CONSTRAINT "consultation_chat_messages_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_attachments" ADD CONSTRAINT "consultation_attachments_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
