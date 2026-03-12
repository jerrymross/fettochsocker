-- AlterTable
ALTER TABLE "Recipe"
ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "RecipePackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipePackageRecipeLink" (
    "packageId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,

    CONSTRAINT "RecipePackageRecipeLink_pkey" PRIMARY KEY ("packageId","recipeId")
);

-- CreateTable
CREATE TABLE "RecipePackageUserLink" (
    "packageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RecipePackageUserLink_pkey" PRIMARY KEY ("packageId","userId")
);

-- CreateIndex
CREATE INDEX "RecipePackage_createdById_idx" ON "RecipePackage"("createdById");

-- CreateIndex
CREATE INDEX "RecipePackageRecipeLink_recipeId_idx" ON "RecipePackageRecipeLink"("recipeId");

-- CreateIndex
CREATE INDEX "RecipePackageUserLink_userId_idx" ON "RecipePackageUserLink"("userId");

-- AddForeignKey
ALTER TABLE "RecipePackage"
ADD CONSTRAINT "RecipePackage_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipePackageRecipeLink"
ADD CONSTRAINT "RecipePackageRecipeLink_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "RecipePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipePackageRecipeLink"
ADD CONSTRAINT "RecipePackageRecipeLink_recipeId_fkey"
FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipePackageUserLink"
ADD CONSTRAINT "RecipePackageUserLink_packageId_fkey"
FOREIGN KEY ("packageId") REFERENCES "RecipePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipePackageUserLink"
ADD CONSTRAINT "RecipePackageUserLink_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
