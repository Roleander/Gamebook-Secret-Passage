-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isStart" BOOLEAN NOT NULL DEFAULT false,
    "isEndpoint" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassageLink" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "linkText" TEXT,
    "condition" TEXT,

    CONSTRAINT "PassageLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "passagesCount" INTEGER NOT NULL,
    "rawContent" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Passage_projectId_sortOrder_idx" ON "Passage"("projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Passage_projectId_number_key" ON "Passage"("projectId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "PassageLink_sourceId_targetId_key" ON "PassageLink"("sourceId", "targetId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passage" ADD CONSTRAINT "Passage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassageLink" ADD CONSTRAINT "PassageLink_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Passage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassageLink" ADD CONSTRAINT "PassageLink_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Passage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportHistory" ADD CONSTRAINT "ImportHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
